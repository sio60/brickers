package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.KidsLevel;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.upload_s3.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsService {

    private final WebClient aiWebClient;
    private final GenerateJobRepository generateJobRepository;
    private final StorageService storageService;

    // ---- timeouts ----
    private static final Duration PROCESS_TIMEOUT = Duration.ofSeconds(600);
    private static final Duration DOWNLOAD_TIMEOUT = Duration.ofSeconds(120);

    /**
     * 레고 생성 + Job DB 저장
     *
     * 흐름:
     * 1) 원본 이미지 저장(가능하면)
     * 2) Job 생성/저장(로그인 사용자만)
     * 3) FastAPI /api/v1/kids/process-all 호출
     * 4) 응답에서 preview / ldr 저장 + modelKey 업데이트
     * 5) Job done or failed 처리
     */
    /**
     * 비동기 생성 요청 진입점
     * 1) Job 생성 (QUEUED)
     * 2) Async 메소드 호출 (백그라운드 처리)
     * 3) JobID 반환 (즉시 응답)
     */
    public Map<String, Object> startGeneration(String userId, MultipartFile file, String age, int budget) {
        log.info("AI 생성 요청 접수: userId={}, age={}, budget={}", safe(userId), safe(age), budget);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("file is empty");
        }

        boolean loggedIn = userId != null && !userId.isBlank();

        // 0) 입력 이미지 저장(원본 보관)
        String sourceImageUrl = null;
        if (loggedIn) {
            try {
                var stored = storageService.storeImage(userId, file);
                sourceImageUrl = stored.url();
            } catch (Exception e) {
                log.warn("원본 이미지 저장 실패(생성 계속): {}", e.getMessage());
            }
        }

        // 1) Job 생성 (로그인 사용자만 저장 - 비로그인은 임시 처리 불가하므로 예외 처리 필요할 수 있음)
        // 현재 로직상 비로그인도 생성은 되지만 저장이 안되면 조회가 불가능함.
        // --> 비로그인도 async 하려면 Job 저장이 필수적이므로, 임시 userId라도 쓰거나 해야 함.
        // 일단 기존 로직 유지하되, 비로그인일 경우 Async 처리가 애매해짐(polling 불가).
        // 정책: 비로그인은 지원 안 함 or 임시 세션 ID 사용. 여기서는 일단 Job을 무조건 저장하도록 변경 권장.
        // (기존 코드는 loggedIn check가 많았으나, Async 전환 시 Job ID가 필수이므로 저장해야 함)

        // 비로그인 사용자도 Job 저장 (userId=null or "anonymous")
        GenerateJobEntity job = GenerateJobEntity.builder()
                .userId(userId) // null allowable
                .level(ageToKidsLevel(age))
                .status(JobStatus.QUEUED)
                .stage(JobStage.THREE_D_PREVIEW)
                .title(file.getOriginalFilename())
                .sourceImageUrl(sourceImageUrl)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .stageUpdatedAt(LocalDateTime.now())
                .build();
        job.ensureDefaults();

        generateJobRepository.save(job);
        log.info("[Brickers] Job saved to DB. jobId={}, userId={}", job.getId(), userId);

        // 2) 비동기 처리 시작
        processGenerationAsync(job.getId(), file, age, budget);

        // 3) 즉시 응답
        return Map.of(
                "jobId", job.getId(),
                "status", JobStatus.QUEUED);
    }

    /**
     * 실제 AI 처리 (별도 스레드)
     */
    @org.springframework.scheduling.annotation.Async
    public void processGenerationAsync(String jobId, MultipartFile file, String age, int budget) {
        log.info("Async 작업 시작: jobId={}", jobId);

        // Job 조회
        GenerateJobEntity job = generateJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.error("Job not found via Async: {}", jobId);
            return;
        }

        // RUNNING 마킹
        job.markRunning(JobStage.THREE_D_PREVIEW);
        generateJobRepository.save(job);

        // FastAPI 멀티파트 구성
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", file.getResource());
        builder.part("age", age);
        builder.part("budget", budget);
        builder.part("returnLdrData", "true");

        try {
            // FastAPI 호출 (오래 걸림)
            Map<String, Object> response = aiWebClient.post()
                    .uri("/api/v1/kids/process-all")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .timeout(PROCESS_TIMEOUT)
                    .block(); // 비동기 스레드 내에서는 block() 해도 됨

            log.info("AI 응답 수신(Async): jobId={}, ok={}", jobId, response != null ? response.get("ok") : false);

            // 결과 반영
            applySuccessResultToJob(job, job.getUserId(), response);
            job.markDone();
            generateJobRepository.save(job);
            log.info("Job 완료(Async): jobId={}", jobId);

        } catch (Exception e) {
            log.error("AI 서버 통신 실패(Async): jobId={}", jobId, e);
            job.markFailed(e.getMessage());
            generateJobRepository.save(job);
        }
    }

    /**
     * FastAPI 응답을 DB job에 반영
     *
     * - correctedUrl: 보정 이미지 다운로드 → 저장 → correctedImageUrl
     * - modelUrl(GLB): 다운로드 → 저장 → glbUrl
     * - ldrData/ldrUrl: LDR 저장 → ldrUrl
     */
    private void applySuccessResultToJob(GenerateJobEntity job, String userId, Map<String, Object> response) {
        if (response == null)
            return;

        // ✅ 1) 보정 이미지 저장 (correctedUrl)
        String correctedUrl = asString(response.get("correctedUrl"));
        if (!isBlank(correctedUrl)) {
            try {
                byte[] imageBytes = downloadBytesByUrl(correctedUrl);
                if (imageBytes != null && imageBytes.length > 0) {
                    String filename = extractFilenameFromUrl(correctedUrl, "corrected.png");
                    var stored = storageService.storeFile(userId, filename, imageBytes, "image/png");
                    job.setCorrectedImageUrl(stored.url());
                    job.setPreviewImageUrl(stored.url()); // preview도 동일하게 설정
                    log.info("✅ 보정 이미지 저장 완료: {}", stored.url());
                }
            } catch (Exception e) {
                log.warn("보정 이미지 저장 실패(원본 URL 유지): {}", e.getMessage());
                job.setCorrectedImageUrl(correctedUrl);
                job.setPreviewImageUrl(correctedUrl);
            }
        }

        // ✅ 2) GLB 파일 저장 (modelUrl)
        String modelUrl = asString(response.get("modelUrl"));
        if (!isBlank(modelUrl)) {
            try {
                byte[] glbBytes = downloadBytesByUrl(modelUrl);
                if (glbBytes != null && glbBytes.length > 0) {
                    String filename = extractFilenameFromUrl(modelUrl, "model.glb");
                    var stored = storageService.storeFile(userId, filename, glbBytes, "application/octet-stream");
                    job.setGlbUrl(stored.url());
                    log.info("✅ GLB 파일 저장 완료: {}", stored.url());
                }
            } catch (Exception e) {
                log.warn("GLB 저장 실패(원본 URL 유지): {}", e.getMessage());
                job.setGlbUrl(modelUrl);
            }
        }

        // ✅ 3) LDR 파일 저장
        String ldrData = asString(response.get("ldrData")); // data:text/plain;base64,...
        String ldrUrlFromResponse = asString(response.get("ldrUrl")); // /api/generated/.../result.ldr

        if (isBlank(ldrData) && isBlank(ldrUrlFromResponse)) {
            log.warn("응답에 ldrData/ldrUrl 둘 다 없음. jobId={}", job.getId());
            return;
        }

        byte[] ldrBytes = null;

        // 1) ldrData 우선 (base64 디코딩)
        if (!isBlank(ldrData) && ldrData.startsWith("data:") && ldrData.contains("base64,")) {
            try {
                ldrBytes = decodeDataUriBase64(ldrData);
            } catch (Exception e) {
                log.warn("ldrData 디코딩 실패(ldrUrl fallback 시도): {}", e.getMessage());
            }
        }

        // 2) ldrData 실패하면 ldrUrl로 다운로드
        if ((ldrBytes == null || ldrBytes.length == 0) && !isBlank(ldrUrlFromResponse)) {
            try {
                ldrBytes = downloadBytesByUrl(ldrUrlFromResponse);
            } catch (Exception e) {
                log.error("ldrUrl 다운로드 실패: url={}, err={}", ldrUrlFromResponse, e.getMessage());
            }
        }

        if (ldrBytes == null || ldrBytes.length == 0) {
            log.error("LDR 확보 실패. jobId={}, keep ldrUrl={}", job.getId(), ldrUrlFromResponse);
            job.setLdrUrl(ldrUrlFromResponse);
            return;
        }

        // LDR 저장
        String filename = extractFilenameFromUrl(ldrUrlFromResponse, "result.ldr");
        try {
            var stored = storageService.storeFile(userId, filename, ldrBytes, "text/plain");
            job.setLdrUrl(stored.url());
            log.info("✅ LDR 파일 저장 완료: {}", stored.url());
        } catch (Exception e) {
            log.error("LDR 저장 실패(원본 ldrUrl 유지): {}", e.getMessage());
            job.setLdrUrl(ldrUrlFromResponse);
        }
    }

    /**
     * data:text/plain;base64,AAAA... -> bytes
     */
    private byte[] decodeDataUriBase64(String dataUri) {
        int comma = dataUri.indexOf(',');
        if (comma < 0)
            throw new IllegalArgumentException("Invalid data URI");
        String b64 = dataUri.substring(comma + 1);
        return Base64.getDecoder().decode(b64);
    }

    /**
     * FastAPI가 제공한 상대/절대 URL로부터 byte[] 다운로드
     *
     * - ldrUrl이 "/api/generated/..." (상대경로)면 baseUrl이 붙어서 호출됨
     */
    private byte[] downloadBytesByUrl(String url) {
        return aiWebClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(byte[].class)
                .timeout(DOWNLOAD_TIMEOUT)
                .block();
    }

    private String extractFilenameFromUrl(String url, String defaultName) {
        if (isBlank(url))
            return defaultName;
        int q = url.indexOf('?');
        String u = (q >= 0) ? url.substring(0, q) : url;
        int slash = u.lastIndexOf('/');
        if (slash >= 0 && slash < u.length() - 1) {
            return u.substring(slash + 1);
        }
        return defaultName;
    }

    private String firstNonBlank(String... arr) {
        if (arr == null)
            return null;
        for (String s : arr) {
            if (!isBlank(s))
                return s;
        }
        return null;
    }

    private String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private String safe(String s) {
        return s == null ? "null" : s;
    }

    /**
     * age 문자열을 KidsLevel로 변환
     */
    /**
     * Polling용 Job 상태 조회
     */
    public GenerateJobEntity getJobStatus(String jobId) {
        log.info("[Brickers] Polling Job Status. jobId={}", jobId);
        return generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));
    }

    private KidsLevel ageToKidsLevel(String age) {
        if (age == null)
            return KidsLevel.LEVEL_1;
        return switch (age.toLowerCase()) {
            case "3-5", "35" -> KidsLevel.LEVEL_1;
            case "6-7", "67" -> KidsLevel.LEVEL_2;
            case "8-10", "810" -> KidsLevel.LEVEL_3;
            default -> KidsLevel.LEVEL_1;
        };
    }
}