package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.repository.GenerateJobRepository;
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
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsAsyncWorker {

    private final WebClient aiWebClient;
    private final GenerateJobRepository generateJobRepository;
    private final KidsJobResultService kidsJobResultService; // Changed from KidsJobService

    @Value("${KIDS_AI_PROCESS_TIMEOUT_SEC:930}")
    private long processTimeoutSec;

    @Async("kidsExecutor")
    public void processGenerationAsync(String jobId, String userId, String sourceImageUrl, String age, int budget,
            String language) {
        long totalStart = System.currentTimeMillis();
        log.info("🚀 [KIDS-WORKER] 작업 시작 | jobId={} | userId={} | age={} | budget={}", jobId, userId, age, budget);

        GenerateJobEntity job = generateJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.error("❌ [KIDS-WORKER] Job을 찾을 수 없음: jobId={}", jobId);
            return;
        }

        job.markRunning(JobStage.THREE_D_PREVIEW);
        generateJobRepository.save(job);

        try {
            log.info("📌 AI 서버 요청 시작 | timeout={}sec", processTimeoutSec);
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
                    .timeout(Duration.ofSeconds(processTimeoutSec))
                    .block();

            long aiElapsed = System.currentTimeMillis() - aiStart;
            log.info("✅ AI 서버 응답 수신 완료 | 소요시간={}ms", aiElapsed);

            // ⚠️ 결과 처리 위임 (Parsing, Storage)
            kidsJobResultService.applyResult(jobId, userId, response);

            long totalElapsed = System.currentTimeMillis() - totalStart;
            log.info("🎉 [KIDS-WORKER] 작업 최종 완료! | jobId={} | 총소요시간={}ms", jobId, totalElapsed);

        } catch (Exception e) {
            log.error("❌ [KIDS-WORKER] 작업 실패! | jobId={} | error={}", jobId, e.getMessage(), e);
            job.markFailed(e.getMessage());
            generateJobRepository.save(job);
        }
    }
}
