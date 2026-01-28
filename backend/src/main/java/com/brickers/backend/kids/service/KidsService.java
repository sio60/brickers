package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.KidsLevel;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsService {

    private final GenerateJobRepository generateJobRepository;
    private final KidsAsyncWorker kidsAsyncWorker;

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
                .sourceImageUrl(sourceImageUrl)  // Frontend가 업로드한 S3 URL
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .stageUpdatedAt(LocalDateTime.now())
                .build();
        job.ensureDefaults();

        generateJobRepository.save(job);
        log.info("[Brickers] Job saved to DB. jobId={}, userId={}", job.getId(), safe(userId));

        // 2) Async 워커로 넘김 (URL 전달)
        kidsAsyncWorker.processGenerationAsync(
                job.getId(),
                userId,
                sourceImageUrl,
                age,
                budget
        );

        // 3) 즉시 응답
        return Map.of("jobId", job.getId(), "status", JobStatus.QUEUED);
    }

    public GenerateJobEntity getJobStatus(String jobId) {
        log.info("[Brickers] Polling Job Status. jobId={}", jobId);
        return generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));
    }

    private KidsLevel ageToKidsLevel(String age) {
        if (age == null) return KidsLevel.LEVEL_1;
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
