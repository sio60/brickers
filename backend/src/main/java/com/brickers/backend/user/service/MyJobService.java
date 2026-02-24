package com.brickers.backend.user.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.user.dto.MyJobResponse;
import com.brickers.backend.user.dto.MyJobRetryRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * ⚙️ MyJobService
 * 
 * 사용자의 이미지 생성 작업(GenerateJob) 관리 비즈니스 로직을 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MyJobService {

    private final GenerateJobRepository generateJobRepository;
    private final UserMapper userMapper;

    /**
     * 내 생성 작업 목록을 조회합니다.
     */
    public Page<MyJobResponse> listMyJobs(String userId, int page, int size) {
        return generateJobRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(userMapper::toJobResponse);
    }

    /**
     * 작업을 재시도합니다.
     */
    @Transactional
    public MyJobResponse retryJob(String userId, String jobId, MyJobRetryRequest req) {
        GenerateJobEntity job = generateJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("작업을 찾을 수 없습니다. id=" + jobId));

        if (!job.getUserId().equals(userId)) {
            throw new IllegalStateException("본인의 작업만 재시도할 수 있습니다.");
        }

        if (job.getStatus() == JobStatus.RUNNING) {
            throw new IllegalStateException("진행 중인 작업은 재시도할 수 없습니다.");
        }

        JobStage fromStage = (req == null) ? null : req.getFromStage();
        if (fromStage == null) {
            fromStage = job.getStage();
        }

        job.setRequestedFromStage(fromStage);
        job.setStatus(JobStatus.QUEUED);
        job.setStage(fromStage);
        job.setErrorMessage(null);

        LocalDateTime now = LocalDateTime.now();
        job.setStageUpdatedAt(now);
        job.setUpdatedAt(now);

        return userMapper.toJobResponse(generateJobRepository.save(job));
    }

    /**
     * 작업을 취소합니다.
     */
    @Transactional
    public MyJobResponse cancelJob(String userId, String jobId) {
        GenerateJobEntity job = generateJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("작업을 찾을 수 없습니다. id=" + jobId));

        if (!job.getUserId().equals(userId)) {
            throw new IllegalStateException("본인의 작업만 취소할 수 있습니다.");
        }

        if (job.getStatus() != JobStatus.QUEUED && job.getStatus() != JobStatus.RUNNING) {
            throw new IllegalStateException("취소할 수 없는 상태입니다 (상태: " + job.getStatus() + ")");
        }

        job.markCanceled("User requested cancellation");
        log.info("[MyJobService] Job CANCELED | jobId={} | userId={}", jobId, userId);

        return userMapper.toJobResponse(generateJobRepository.save(job));
    }
}
