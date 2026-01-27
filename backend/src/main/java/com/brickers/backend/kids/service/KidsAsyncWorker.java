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

    private Duration processTimeout() {
        return Duration.ofSeconds(processTimeoutSec);
    }

    private Duration downloadTimeout() {
        return Duration.ofSeconds(downloadTimeoutSec);
    }

    @Async("kidsExecutor")
    public void processGenerationAsync(
            String jobId,
            String userId,
            byte[] fileBytes,
            String originalFilename,
            String contentType,
            String age,
            int budget) {
        long totalStart = System.currentTimeMillis();
        log.info("═══════════════════════════════════════════════════════════════");
        log.info("🚀 [KIDS-WORKER] 작업 시작 | jobId={} | userId={} | age={} | budget={}",
                jobId, userId, age, budget);
        log.info("📁 파일 정보: name={} | size={}KB | type={}",
                originalFilename, fileBytes.length / 1024, contentType);
        log.info("═══════════════════════════════════════════════════════════════");

        GenerateJobEntity job = generateJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.error("❌ [KIDS-WORKER] Job을 찾을 수 없음: jobId={}", jobId);
            return;
        }

        job.markRunning(JobStage.THREE_D_PREVIEW);
        generateJobRepository.save(job);
        log.info("📌 [STEP 1/5] Job 상태 업데이트: RUNNING | stage=THREE_D_PREVIEW");

        String safeUserId = (userId == null || userId.isBlank()) ? "anonymous" : userId;
        String safeContentType = (contentType == null || contentType.isBlank()) ? "application/octet-stream"
                : contentType;

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
            log.info("📌 [STEP 2/5] AI 서버 요청 시작 | endpoint=/api/v1/kids/process-all | timeout={}sec",
                    processTimeoutSec);
            long aiStart = System.currentTimeMillis();

            Map<String, Object> response = aiWebClient.post()
                    .uri("/api/v1/kids/process-all")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .timeout(processTimeout())
                    .block();

            long aiElapsed = System.currentTimeMillis() - aiStart;
            log.info("✅ [STEP 2/5] AI 서버 응답 수신 완료 | 소요시간={}ms ({}초)", aiElapsed, aiElapsed / 1000);

            if (response != null) {
                log.info("📊 AI 응답 요약: ok={} | reqId={} | parts={} | finalTarget={}",
                        response.get("ok"), response.get("reqId"),
                        response.get("parts"), response.get("finalTarget"));
            }

            log.info("📌 [STEP 3/5] 결과물 저장 시작 (S3 업로드)...");
            long saveStart = System.currentTimeMillis();

            applySuccessResultToJob(job, safeUserId, response);

            long saveElapsed = System.currentTimeMillis() - saveStart;
            log.info("✅ [STEP 3/5] 결과물 저장 완료 | 소요시간={}ms", saveElapsed);

            log.info("📌 [STEP 4/5] Job 상태 업데이트: DONE");
            job.markDone();
            generateJobRepository.save(job);

            long totalElapsed = System.currentTimeMillis() - totalStart;
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("🎉 [KIDS-WORKER] 작업 완료! | jobId={}", jobId);
            log.info("⏱️ 총 소요시간: {}ms ({}초) | AI처리: {}초 | 저장: {}ms",
                    totalElapsed, totalElapsed / 1000, aiElapsed / 1000, saveElapsed);
            log.info("📦 결과: glbUrl={}", job.getGlbUrl() != null ? "✅" : "❌");
            log.info("📦 결과: ldrUrl={}", job.getLdrUrl() != null ? "✅" : "❌");
            log.info("📦 결과: previewUrl={}", job.getPreviewImageUrl() != null ? "✅" : "❌");
            log.info("═══════════════════════════════════════════════════════════════");

        } catch (Exception e) {
            long totalElapsed = System.currentTimeMillis() - totalStart;
            log.error("═══════════════════════════════════════════════════════════════");
            log.error("❌ [KIDS-WORKER] 작업 실패! | jobId={} | 소요시간={}ms", jobId, totalElapsed);
            log.error("❌ 에러 메시지: {}", e.getMessage());
            log.error("═══════════════════════════════════════════════════════════════", e);
            job.markFailed(e.getMessage());
            generateJobRepository.save(job);
        }
    }

    private void applySuccessResultToJob(GenerateJobEntity job, String userId, Map<String, Object> response) {
        if (response == null)
            return;

        // correctedUrl 저장
        String correctedUrl = asString(response.get("correctedUrl"));
        if (!isBlank(correctedUrl)) {
            log.info("   📥 [SAVE] corrected 이미지 다운로드 중... | url={}", truncateUrl(correctedUrl));
            try {
                long start = System.currentTimeMillis();
                byte[] imageBytes = downloadBytesByUrl(correctedUrl);
                log.info("   📥 [SAVE] corrected 다운로드 완료 | size={}KB | {}ms",
                        imageBytes.length / 1024, System.currentTimeMillis() - start);

                start = System.currentTimeMillis();
                var stored = storageService.storeFile(userId, "corrected.png", imageBytes, "image/png");
                log.info("   📤 [SAVE] corrected S3 업로드 완료 | {}ms | url={}",
                        System.currentTimeMillis() - start, truncateUrl(stored.url()));
                job.setCorrectedImageUrl(stored.url());
                job.setPreviewImageUrl(stored.url());
            } catch (Exception e) {
                log.warn("   ⚠️ [SAVE] corrected 저장 실패 (원본 URL 사용): {}", e.getMessage());
                job.setCorrectedImageUrl(correctedUrl);
                job.setPreviewImageUrl(correctedUrl);
            }
        }

        // modelUrl(GLB) 저장
        String modelUrl = asString(response.get("modelUrl"));
        if (!isBlank(modelUrl)) {
            log.info("   📥 [SAVE] GLB 모델 다운로드 중... | url={}", truncateUrl(modelUrl));
            try {
                long start = System.currentTimeMillis();
                byte[] glbBytes = downloadBytesByUrl(modelUrl);
                log.info("   📥 [SAVE] GLB 다운로드 완료 | size={}KB | {}ms",
                        glbBytes.length / 1024, System.currentTimeMillis() - start);

                start = System.currentTimeMillis();
                var stored = storageService.storeFile(userId, "model.glb", glbBytes, "application/octet-stream");
                log.info("   📤 [SAVE] GLB S3 업로드 완료 | {}ms | url={}",
                        System.currentTimeMillis() - start, truncateUrl(stored.url()));
                job.setGlbUrl(stored.url());
            } catch (Exception e) {
                log.warn("   ⚠️ [SAVE] GLB 저장 실패 (원본 URL 사용): {}", e.getMessage());
                job.setGlbUrl(modelUrl);
            }
        }

        // ldrData or ldrUrl
        String ldrData = asString(response.get("ldrData"));
        String ldrUrl = asString(response.get("ldrUrl"));

        byte[] ldrBytes = null;

        if (!isBlank(ldrData) && ldrData.startsWith("data:") && ldrData.contains("base64,")) {
            log.info("   📥 [SAVE] LDR base64 데이터 디코딩 중...");
            try {
                ldrBytes = decodeDataUriBase64(ldrData);
                log.info("   📥 [SAVE] LDR base64 디코딩 완료 | size={}KB", ldrBytes.length / 1024);
            } catch (Exception e) {
                log.warn("   ⚠️ [SAVE] LDR base64 디코딩 실패, URL 다운로드로 fallback: {}", e.getMessage());
            }
        }

        if ((ldrBytes == null || ldrBytes.length == 0) && !isBlank(ldrUrl)) {
            log.info("   📥 [SAVE] LDR 파일 다운로드 중... | url={}", truncateUrl(ldrUrl));
            try {
                long start = System.currentTimeMillis();
                ldrBytes = downloadBytesByUrl(ldrUrl);
                log.info("   📥 [SAVE] LDR 다운로드 완료 | size={}KB | {}ms",
                        ldrBytes.length / 1024, System.currentTimeMillis() - start);
            } catch (Exception e) {
                log.warn("   ⚠️ [SAVE] LDR 다운로드 실패: {}", e.getMessage());
            }
        }

        if (ldrBytes == null || ldrBytes.length == 0) {
            log.warn("   ⚠️ [SAVE] LDR 데이터 없음, 원본 URL 사용");
            job.setLdrUrl(ldrUrl);
            return;
        }

        try {
            long start = System.currentTimeMillis();
            var stored = storageService.storeFile(userId, "result.ldr", ldrBytes, "text/plain");
            log.info("   📤 [SAVE] LDR S3 업로드 완료 | {}ms | url={}",
                    System.currentTimeMillis() - start, truncateUrl(stored.url()));
            job.setLdrUrl(stored.url());
        } catch (Exception e) {
            log.warn("   ⚠️ [SAVE] LDR 저장 실패 (원본 URL 사용): {}", e.getMessage());
            job.setLdrUrl(ldrUrl);
        }
    }

    private String truncateUrl(String url) {
        if (url == null)
            return "null";
        return url.length() > 80 ? url.substring(0, 40) + "..." + url.substring(url.length() - 30) : url;
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
        if (comma < 0)
            throw new IllegalArgumentException("Invalid data URI");
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
