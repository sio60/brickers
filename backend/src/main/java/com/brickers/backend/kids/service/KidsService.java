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
    private static final Duration PROCESS_TIMEOUT = Duration.ofSeconds(300);
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
    public Map<String, Object> generateBrick(String userId, MultipartFile file, String age, int budget) {
        log.info("AI 생성 요청 시작: userId={}, age={}, budget={}, filename={}",
                safe(userId), safe(age), budget, file != null ? file.getOriginalFilename() : null);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("file is empty");
        }

        boolean loggedIn = userId != null && !userId.isBlank();

        // 0) 입력 이미지 저장(원본 보관) - 실패해도 계속 진행
        String sourceImageUrl = null;
        if (loggedIn) {
            try {
                var stored = storageService.storeImage(userId, file);
                sourceImageUrl = stored.url();
            } catch (Exception e) {
                log.warn("원본 이미지 저장 실패(생성 계속): {}", e.getMessage());
            }
        }

        // 1) Job 생성 (로그인 사용자만 저장)
        GenerateJobEntity job = GenerateJobEntity.builder()
                .userId(userId)
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

        if (loggedIn) {
            generateJobRepository.save(job);
            log.info("Job 생성 완료: jobId={}", job.getId());
        }

        // 2) RUNNING 반영
        job.markRunning(JobStage.THREE_D_PREVIEW);
        if (loggedIn) {
            generateJobRepository.save(job);
        }

        // 3) FastAPI로 멀티파트 구성
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", file.getResource());
        builder.part("age", age);
        builder.part("budget", budget);
        // ✅ FastAPI는 returnLdrData 기본 true라 굳이 안 넣어도 되지만 명시해도 됨
        builder.part("returnLdrData", "true");

        try {
            // 4) FastAPI 호출
            Map<String, Object> response = aiWebClient.post()
                    .uri("/api/v1/kids/process-all")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .timeout(PROCESS_TIMEOUT)
                    .block();

            log.info("AI 응답 수신: ok={}, keys={}",
                    response != null ? response.get("ok") : null,
                    response != null ? response.keySet() : null);

            // 5) 성공 시 Job 업데이트(로그인 사용자만)
            if (loggedIn) {
                applySuccessResultToJob(job, userId, response);
                job.markDone();
                generateJobRepository.save(job);
                log.info("Job 완료: jobId={}", job.getId());
            }

            return response;

        } catch (Exception e) {
            log.error("AI 서버 통신 실패", e);

            if (loggedIn) {
                job.markFailed(e.getMessage());
                generateJobRepository.save(job);
                log.info("Job 실패 처리: jobId={}", job.getId());
            }

            throw new RuntimeException("AI 서버가 응답하지 않습니다: " + e.getMessage(), e);
        }
    }

    /**
     * FastAPI 응답을 DB job에 반영
     *
     * - preview: correctedUrl 사용 (기존 image_url 키는 폐기/호환용으로만 체크)
     * - ldr: ldrData (data URI base64) 우선, 없으면 ldrUrl을 HTTP GET으로 다운로드
     * - 저장 후 job.modelKey = 저장된 URL
     */
    private void applySuccessResultToJob(GenerateJobEntity job, String userId, Map<String, Object> response) {
        if (response == null)
            return;

        // ✅ preview URL (FastAPI: correctedUrl)
        String previewUrl = firstNonBlank(
                asString(response.get("correctedUrl")),
                asString(response.get("image_url")) // 과거 호환
        );
        if (previewUrl != null) {
            job.setPreviewImageUrl(previewUrl);
        }

        // ✅ LDR 처리
        String ldrData = asString(response.get("ldrData")); // data:text/plain;base64,...
        String ldrUrl = asString(response.get("ldrUrl")); // /api/generated/.../result.ldr

        if (isBlank(ldrData) && isBlank(ldrUrl)) {
            // LDR이 없으면 modelKey 업데이트 못함 (원하면 여기서 예외로 막아도 됨)
            log.warn("응답에 ldrData/ldrUrl 둘 다 없음. jobId={}", job.getId());
            return;
        }

        byte[] ldrBytes = null;

        // 1) ldrData 우선
        if (!isBlank(ldrData) && ldrData.startsWith("data:") && ldrData.contains("base64,")) {
            try {
                ldrBytes = decodeDataUriBase64(ldrData);
            } catch (Exception e) {
                log.warn("ldrData 디코딩 실패(ldrUrl fallback 시도): {}", e.getMessage());
            }
        }

        // 2) ldrData 실패/없으면 ldrUrl로 다시 다운로드
        if ((ldrBytes == null || ldrBytes.length == 0) && !isBlank(ldrUrl)) {
            try {
                ldrBytes = downloadBytesByUrl(ldrUrl);
            } catch (Exception e) {
                log.error("ldrUrl 다운로드 실패: url={}, err={}", ldrUrl, e.getMessage());
            }
        }

        if (ldrBytes == null || ldrBytes.length == 0) {
            // 최후: 원본 ldrUrl 유지(그래도 사용자에게 링크라도)
            log.error("LDR 확보 실패(ldrData/ldrUrl 모두 실패). jobId={}, keep modelKey=ldrUrl",
                    job.getId());
            job.setModelKey(ldrUrl);
            return;
        }

        // 저장 파일명: ldrUrl에서 마지막 파일명 추출, 없으면 result.ldr
        String filename = extractFilenameFromUrl(ldrUrl, "result.ldr");

        try {
            var stored = storageService.storeFile(userId, filename, ldrBytes, "text/plain");
            job.setModelKey(stored.url());
            log.info("LDR 파일 스토리지 이관 완료: {}", stored.url());
        } catch (Exception e) {
            log.error("LDR 저장 실패(원본 ldrUrl 유지): {}", e.getMessage());
            job.setModelKey(ldrUrl);
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