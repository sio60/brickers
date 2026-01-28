package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.KidsLevel;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.upload_s3.service.StorageService;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;

import com.brickers.backend.sqs.service.SqsProducerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsService {

    private final GenerateJobRepository generateJobRepository;
    private final StorageService storageService;
    private final KidsAsyncWorker kidsAsyncWorker;
    private final UserRepository userRepository;
    private final SqsProducerService sqsProducerService;

    @Value("${aws.sqs.enabled:false}")
    private boolean sqsEnabled;

    public Map<String, Object> startGeneration(String userId, String sourceImageUrl, String age, int budget) {
        log.info("AI 생성 요청 접수: userId={}, sourceImageUrl={}, age={}, budget={}",
                safe(userId), sourceImageUrl, safe(age), budget);

        if (sourceImageUrl == null || sourceImageUrl.isBlank()) {
            throw new IllegalArgumentException("sourceImageUrl is required");
        }

        // 1) Job 생성/저장
        GenerateJobEntity job = GenerateJobEntity.builder()
                .userId(userId) // null 허용
                .level(ageToKidsLevel(age))
                .status(JobStatus.QUEUED)
                .stage(JobStage.THREE_D_PREVIEW)
                .sourceImageUrl(sourceImageUrl) // Frontend가 업로드한 S3 URL
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .stageUpdatedAt(LocalDateTime.now())
                .build();
        job.ensureDefaults();

        generateJobRepository.save(job);
        log.info("[Brickers] Job saved to DB. jobId={}, userId={}", job.getId(), safe(userId));

        // 2) SQS 또는 Async 워커로 작업 전달
        if (sqsEnabled) {
            // ✅ SQS로 작업 요청 전송
            log.info("[Brickers] SQS로 작업 요청 전송 | jobId={}", job.getId());
            sqsProducerService.sendJobRequest(
                    job.getId(),
                    userId,
                    sourceImageUrl,
                    age,
                    budget);
        } else {
            // ⚠️ 기존 방식 (직접 호출) - 개발/테스트용
            log.info("[Brickers] 직접 호출 모드 (SQS 비활성화) | jobId={}", job.getId());
            // kidsAsyncWorker는 제거됨 (SQS 전환)
            throw new UnsupportedOperationException("SQS 모드를 활성화해주세요");
        }

        // 3) 즉시 응답
        return Map.of("jobId", job.getId(), "status", JobStatus.QUEUED);
    }

    public GenerateJobEntity getJobStatus(String jobId) {
        log.info("[Brickers] Polling Job Status. jobId={}", jobId);
        return generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));
    }

    /**
     * Job stage 업데이트 (AI Server에서 호출)
     */
    public void updateJobStage(String jobId, String stageName) {
        log.info("[Brickers] Job Stage 업데이트 | jobId={} | stage={}", jobId, stageName);

        GenerateJobEntity job = generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));

        // String → JobStage enum 변환
        JobStage stage;
        try {
            stage = JobStage.valueOf(stageName);
        } catch (IllegalArgumentException e) {
            log.warn("[Brickers] 알 수 없는 stage 무시 | jobId={} | stageName={}", jobId, stageName);
            return;
        }

        // Job 상태를 RUNNING으로 변경 (첫 stage 업데이트 시)
        if (job.getStatus() == JobStatus.QUEUED) {
            job.markRunning(stage);
        } else {
            job.moveToStage(stage);
        }

        generateJobRepository.save(job);
        log.info("[Brickers] ✅ Job Stage 업데이트 완료 | jobId={} | stage={}", jobId, stage);
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

    private String safe(String s) {
        return s == null ? "null" : s;
    }
}
