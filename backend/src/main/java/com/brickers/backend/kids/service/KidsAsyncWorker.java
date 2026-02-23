package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.upload_s3.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
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
            String sourceImageUrl,
            String age,
            int budget,
            String language) {
        long totalStart = System.currentTimeMillis();
        log.info("═══════════════════════════════════════════════════════════════");
        log.info("🚀 [KIDS-WORKER] 작업 시작 | jobId={} | userId={} | age={} | budget={}",
                jobId, userId, age, budget);
        log.info("📁 원본 이미지 URL: {}", sourceImageUrl);
        log.info("🌐 언어 설정: {}", language);
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

        try {
            log.info("📌 [STEP 2/5] AI 서버 요청 시작 | endpoint=/api/v1/kids/process-all | timeout={}sec",
                    processTimeoutSec);
            long aiStart = System.currentTimeMillis();

            Map<String, Object> response = aiWebClient.post()
                    .uri("/api/v1/kids/process-all")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(BodyInserters.fromValue(Map.of(
                            "sourceImageUrl", sourceImageUrl,
                            "age", age,
                            "budget", budget,
                            "language", (language == null ? "en" : language))))
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

            // [Race Condition Fix] DB에서 최신 상태를 다시 읽어와서 중간에 PATCH된 데이터(카테고리, PDF 등) 유실 방지
            job = generateJobRepository.findById(jobId).orElse(job);

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
            log.info("📦 결과: bomUrl={}", job.getBomUrl() != null ? "✅" : "❌");
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

        // ✅ S3 URL 직접 저장 (다운로드/업로드 제거)

        // 0. lmmLatency (AI 생성 시간)
        try {
            if (response.containsKey("lmmLatency")) {
                Object val = response.get("lmmLatency");
                if (val instanceof Number) {
                    job.setLmmLatency(((Number) val).intValue());
                    log.info("   ✅ [SAVE] lmmLatency 저장: {}ms", val);
                }
            }
        } catch (Exception e) {
            log.warn("   ⚠️ [SAVE] lmmLatency 저장 실패: {}", e.getMessage());
        }

        // 1. correctedUrl
        String correctedUrl = asString(response.get("correctedUrl"));
        if (!isBlank(correctedUrl)) {
            log.info("   ✅ [SAVE] corrected S3 URL 직접 사용 | url={}", truncateUrl(correctedUrl));
            job.setCorrectedImageUrl(correctedUrl);
            job.setPreviewImageUrl(correctedUrl);
        }

        // 2. modelUrl (GLB)
        String modelUrl = asString(response.get("modelUrl"));
        if (!isBlank(modelUrl)) {
            log.info("   ✅ [SAVE] GLB S3 URL 직접 사용 | url={}", truncateUrl(modelUrl));
            job.setGlbUrl(modelUrl);
        }

        // 3. ldrUrl
        String ldrUrl = asString(response.get("ldrUrl"));
        if (!isBlank(ldrUrl)) {
            log.info("   ✅ [SAVE] LDR S3 URL 직접 사용 | url={}", truncateUrl(ldrUrl));
            job.setLdrUrl(ldrUrl);
        }

        // 3.5 initialLdrUrl [New]
        String initialLdrUrl = asString(response.get("initialLdrUrl"));
        if (!isBlank(initialLdrUrl)) {
            log.info("   ✅ [SAVE] Initial LDR S3 URL 직접 사용 | url={}", truncateUrl(initialLdrUrl));
            job.setInitialLdrUrl(initialLdrUrl);
        }

        // 4. bomUrl (BOM 파일)
        String bomUrl = asString(response.get("bomUrl"));
        if (!isBlank(bomUrl)) {
            log.info("   ✅ [SAVE] BOM S3 URL 직접 사용 | url={}", truncateUrl(bomUrl));
            job.setBomUrl(bomUrl);
        }

        // 4.1. backgroundUrl [NEW]
        String bgUrl = asString(response.get("backgroundUrl"));
        if (!isBlank(bgUrl)) {
            log.info("   ✅ [SAVE] Background S3 URL 직접 사용 | url={}", truncateUrl(bgUrl));
            job.setBackgroundUrl(bgUrl);
        }

        // 5. [FIX] suggestedTags & imageCategory (AI 서버에서 누락된 경우 DB 덮어쓰기 방지)
        try {
            if (response.containsKey("suggestedTags")) {
                Object tags = response.get("suggestedTags");
                if (tags instanceof java.util.List) {
                    @SuppressWarnings("unchecked")
                    java.util.List<String> tagList = (java.util.List<String>) tags;
                    job.setSuggestedTags(tagList);
                    log.info("   ✅ [SAVE] suggestedTags 저장: {}", tagList);
                }
            }
            if (response.containsKey("imageCategory")) {
                job.setImageCategory(asString(response.get("imageCategory")));
                log.info("   ✅ [SAVE] imageCategory 저장: {}", job.getImageCategory());
            }

            // [NEW] screenshots 저장 (Stale overwrite 방지)
            if (response.containsKey("screenshots")) {
                Object ss = response.get("screenshots");
                if (ss instanceof java.util.Map) {
                    @SuppressWarnings("unchecked")
                    java.util.Map<String, String> ssMap = (java.util.Map<String, String>) ss;
                    job.setScreenshotUrls(ssMap);
                    log.info("   ✅ [SAVE] screenshots {}개 저장", ssMap.size());
                }
            }

            // 6. [NEW] parts, finalTarget, subject 저장
            if (response.containsKey("parts")) {
                Object p = response.get("parts");
                if (p instanceof Number) {
                    job.setParts(((Number) p).intValue());
                }
            }
            if (response.containsKey("finalTarget")) {
                Object ft = response.get("finalTarget");
                if (ft instanceof Number) {
                    job.setFinalTarget(((Number) ft).intValue());
                }
            }
            if (response.containsKey("subject")) {
                String sub = asString(response.get("subject"));
                if (!isBlank(sub)) {
                    job.setTitle(sub);
                }
            }
        } catch (Exception e) {
            log.warn("   ⚠️ [SAVE] Tags/Category/Meta 저장 실패: {}", e.getMessage());
        }

        // 6.5 [NEW] Stability Score
        try {
            if (response.containsKey("stabilityScore")) {
                Object val = response.get("stabilityScore");
                if (val instanceof Number) {
                    job.setStabilityScore(((Number) val).intValue());
                    log.info("   ✅ [SAVE] Stability Score: {}", job.getStabilityScore());
                }
            }
        } catch (Exception e) {
            log.warn("   ⚠️ [SAVE] Stability Score 저장 실패: {}", e.getMessage());
        }

        // 7. [NEW] Cost & Token Usage
        try {
            // tokenCount
            if (response.containsKey("tokenCount")) {
                Object val = response.get("tokenCount");
                if (val instanceof Number) {
                    job.setTokenCount(((Number) val).intValue());
                    log.info("   ✅ [SAVE] Token Count: {}", job.getTokenCount());
                }
            }

            // estCost (AI가 계산해서 준 경우)
            if (response.containsKey("estCost")) {
                Object val = response.get("estCost");
                if (val instanceof Number) {
                    job.setEstCost(((Number) val).doubleValue());
                    log.info("   ✅ [SAVE] Est Cost (from AI): ${}", job.getEstCost());
                }
            }

            // Fallback Calculation if estCost is missing
            if (job.getEstCost() == null) {
                double baseCost = 0.30; // Tripo default
                if (job.getTokenCount() != null) {
                    // Approximate: $0.15 / 1M tokens (Gemini Flash blended) = 0.00000015
                    double tokenCost = job.getTokenCount() * 0.00000015;
                    double total = baseCost + tokenCost;
                    job.setEstCost(Math.round(total * 10000.0) / 10000.0); // 소수점 4자리 반올림
                    log.info("   ✅ [SAVE] Est Cost (Calculated): ${}", job.getEstCost());
                } else {
                    job.setEstCost(0.35); // Default fallback
                    log.info("   ✅ [SAVE] Est Cost (Default): $0.35");
                }
            }
        } catch (Exception e) {
            log.warn("   ⚠️ [SAVE] Cost Calculation Failed: {}", e.getMessage());
        }

        // ⚠️ ldrData (base64)가 있으면 여전히 디코딩 후 S3 업로드 필요 (S3 미사용 환경 대비)
        String ldrData = asString(response.get("ldrData"));
        if (!isBlank(ldrData) && ldrData.startsWith("data:")) {
            log.info("   📥 [SAVE] LDR base64 디코딩 후 S3 업로드");
            try {
                byte[] ldrBytes = decodeDataUriBase64(ldrData);
                var stored = storageService.storeFile(userId, "result.ldr", ldrBytes, "text/plain");
                job.setLdrUrl(stored.url());
                log.info("   ✅ [SAVE] LDR base64 → S3 업로드 완료 | url={}", truncateUrl(stored.url()));
            } catch (Exception e) {
                log.warn("   ⚠️ [SAVE] LDR base64 디코딩 실패: {}", e.getMessage());
                // ldrUrl fallback은 위에서 이미 처리됨
            }
        }
    }

    private String truncateUrl(String url) {
        if (url == null || url.length() <= 80)
            return url;
        return url.substring(0, 77) + "...";
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
