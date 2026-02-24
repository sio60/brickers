package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * 🚀 KidsJobService
 * 이미지 생성 작업(Job)의 상태 관리, 단계 업데이트, 결과 반영을 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KidsJobService {

    private final GenerateJobRepository jobRepository;

    /**
     * Job 상태 조회
     */
    public GenerateJobEntity getJobStatus(String jobId) {
        log.info("[KidsJobService] Polling Job Status. jobId={}", jobId);
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new NoSuchElementException("Job not found: " + jobId));
    }

    /**
     * 작업 단계(Stage) 업데이트
     */
    @Transactional
    public void updateJobStage(String jobId, String stageName) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new NoSuchElementException("Job not found: " + jobId));

        try {
            JobStage stage = JobStage.valueOf(stageName);
            if (job.getStatus() == JobStatus.QUEUED) {
                job.markRunning(stage);
            } else {
                job.moveToStage(stage);
            }
            jobRepository.save(job);
        } catch (IllegalArgumentException e) {
            log.warn("[KidsJobService] 알 수 없는 stage 무시 | jobId={} | stageName={}", jobId, stageName);
        }
    }

    // --- 개별 필드 원자적 업데이트 ---

    @Transactional
    public void updatePdfUrl(String jobId, String pdfUrl) {
        updateField(jobId, j -> j.setPdfUrl(pdfUrl));
    }

    @Transactional
    public void updateBackgroundUrl(String jobId, String bgUrl) {
        updateField(jobId, j -> j.setBackgroundUrl(bgUrl));
    }

    @Transactional
    public void updateScreenshotUrls(String jobId, Map<String, String> urls) {
        updateField(jobId, j -> j.setScreenshotUrls(urls));
    }

    @Transactional
    public void updateSuggestedTags(String jobId, List<String> tags) {
        updateField(jobId, j -> j.setSuggestedTags(tags));
    }

    @Transactional
    public void updateJobCategory(String jobId, String cat) {
        updateField(jobId, j -> j.setImageCategory(cat));
    }

    private void updateField(String jobId, java.util.function.Consumer<GenerateJobEntity> updater) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new NoSuchElementException("Job not found: " + jobId));
        updater.accept(job);
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);
    }
}
