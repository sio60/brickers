package com.brickers.backend.job.service;

import com.brickers.backend.job.dto.UpdateResultsRequest;
import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GenerateJobService {

    private final GenerateJobRepository jobRepository;

    @Transactional
    public void updateStage(String jobId, JobStage stage, JobStatus status) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));

        job.ensureDefaults();
        if (stage != null)
            job.setStage(stage);
        if (status != null)
            job.setStatus(status);
        job.touch();

        jobRepository.save(job);
        log.info("Job {} updated: stage={}, status={}", jobId, stage, status);
    }

    @Transactional
    public void updateResults(String jobId, UpdateResultsRequest req) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));

        job.ensureDefaults();
        if (req.getPreviewImageUrl() != null)
            job.setPreviewImageUrl(req.getPreviewImageUrl());
        if (req.getModelKey() != null)
            job.setModelKey(req.getModelKey());
        if (req.getBlueprintPdfKey() != null)
            job.setBlueprintPdfKey(req.getBlueprintPdfKey());
        if (req.getBomKey() != null)
            job.setBomKey(req.getBomKey());

        job.touch();
        jobRepository.save(job);
        log.info("Job {} results updated", jobId);
    }

    @Transactional
    public void markFailed(String jobId, String message) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));

        job.ensureDefaults();
        job.markFailed(message);
        jobRepository.save(job);
        log.error("Job {} failed: {}", jobId, message);
    }
}
