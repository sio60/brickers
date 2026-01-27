package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.upload_s3.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Base64;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsAsyncWorker {

    private final WebClient aiWebClient;
    private final GenerateJobRepository generateJobRepository;
    private final StorageService storageService;

    // ✅ env로 조절 가능 (docker-compose에 넣으면 바로 먹음)
    // 예: KIDS_AI_PROCESS_TIMEOUT_SEC=930
    @Value("${KIDS_AI_PROCESS_TIMEOUT_SEC:930}")
    private long processTimeoutSec;

    // 예: KIDS_AI_DOWNLOAD_TIMEOUT_SEC=180
    @Value("${KIDS_AI_DOWNLOAD_TIMEOUT_SEC:180}")
    private long downloadTimeoutSec;

    private Duration processTimeout() { return Duration.ofSeconds(processTimeoutSec); }
    private Duration downloadTimeout() { return Duration.ofSeconds(downloadTimeoutSec); }

    @Async("kidsExecutor")
    public void processGenerationAsync(
            String jobId,
            String userId,
            byte[] fileBytes,
            String originalFilename,
            String contentType,
            String age,
            int budget
    ) {
        log.info("[KidsAsyncWorker] start jobId={}", jobId);

        GenerateJobEntity job = generateJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.error("[KidsAsyncWorker] job not found: {}", jobId);
            return;
        }

        job.markRunning(JobStage.THREE_D_PREVIEW);
        generateJobRepository.save(job);

        String safeUserId = (userId == null || userId.isBlank()) ? "anonymous" : userId;
        String safeContentType = (contentType == null || contentType.isBlank()) ? "application/octet-stream" : contentType;

        // ✅ ByteArrayResource로 멀티파트 구성 (MultipartFile 수명문제 없음)
        ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return (originalFilename == null || originalFilename.isBlank()) ? "upload.png" : originalFilename;
            }
        };

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", fileResource).contentType(MediaType.parseMediaType(safeContentType));
        builder.part("age", age);
        builder.part("budget", String.valueOf(budget));
        builder.part("returnLdrData", "true");

        try {
            Map<String, Object> response = aiWebClient.post()
                    .uri("/api/v1/kids/process-all")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(processTimeout())
                    .block();

            applySuccessResultToJob(job, safeUserId, response);

            job.markDone();
            generateJobRepository.save(job);
            log.info("[KidsAsyncWorker] done jobId={}", jobId);

        } catch (Exception e) {
            log.error("[KidsAsyncWorker] failed jobId={} err={}", jobId, e.getMessage(), e);
            job.markFailed(e.getMessage());
            generateJobRepository.save(job);
        }
    }

    private void applySuccessResultToJob(GenerateJobEntity job, String userId, Map<String, Object> response) {
        if (response == null) return;

        // correctedUrl 저장
        String correctedUrl = asString(response.get("correctedUrl"));
        if (!isBlank(correctedUrl)) {
            try {
                byte[] imageBytes = downloadBytesByUrl(correctedUrl);
                String filename = "corrected.png";
                var stored = storageService.storeFile(userId, filename, imageBytes, "image/png");
                job.setCorrectedImageUrl(stored.url());
                job.setPreviewImageUrl(stored.url());
            } catch (Exception e) {
                log.warn("[KidsAsyncWorker] corrected save failed: {}", e.getMessage());
                job.setCorrectedImageUrl(correctedUrl);
                job.setPreviewImageUrl(correctedUrl);
            }
        }

        // modelUrl(GLB) 저장
        String modelUrl = asString(response.get("modelUrl"));
        if (!isBlank(modelUrl)) {
            try {
                byte[] glbBytes = downloadBytesByUrl(modelUrl);
                String filename = "model.glb";
                var stored = storageService.storeFile(userId, filename, glbBytes, "application/octet-stream");
                job.setGlbUrl(stored.url());
            } catch (Exception e) {
                log.warn("[KidsAsyncWorker] glb save failed: {}", e.getMessage());
                job.setGlbUrl(modelUrl);
            }
        }

        // ldrData or ldrUrl
        String ldrData = asString(response.get("ldrData"));
        String ldrUrl = asString(response.get("ldrUrl"));

        byte[] ldrBytes = null;

        if (!isBlank(ldrData) && ldrData.startsWith("data:") && ldrData.contains("base64,")) {
            try {
                ldrBytes = decodeDataUriBase64(ldrData);
            } catch (Exception e) {
                log.warn("[KidsAsyncWorker] ldrData decode failed, fallback to ldrUrl: {}", e.getMessage());
            }
        }

        if ((ldrBytes == null || ldrBytes.length == 0) && !isBlank(ldrUrl)) {
            try {
                ldrBytes = downloadBytesByUrl(ldrUrl);
            } catch (Exception e) {
                log.warn("[KidsAsyncWorker] ldrUrl download failed: {}", e.getMessage());
            }
        }

        if (ldrBytes == null || ldrBytes.length == 0) {
            job.setLdrUrl(ldrUrl);
            return;
        }

        try {
            var stored = storageService.storeFile(userId, "result.ldr", ldrBytes, "text/plain");
            job.setLdrUrl(stored.url());
        } catch (Exception e) {
            log.warn("[KidsAsyncWorker] ldr save failed: {}", e.getMessage());
            job.setLdrUrl(ldrUrl);
        }
    }

    private byte[] downloadBytesByUrl(String url) {
        return aiWebClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(byte[].class)
                .timeout(downloadTimeout())
                .block();
    }

    private byte[] decodeDataUriBase64(String dataUri) {
        int comma = dataUri.indexOf(',');
        if (comma < 0) throw new IllegalArgumentException("Invalid data URI");
        String b64 = dataUri.substring(comma + 1);
        return Base64.getDecoder().decode(b64);
    }

    private String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
