package com.brickers.backend.admin.job.service;

import com.brickers.backend.admin.job.dto.AdminJobDto;
import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminJobService {

    private final GenerateJobRepository jobRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<AdminJobDto> getAllJobs(JobStatus status, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<GenerateJobEntity> result;
        if (status != null) {
            result = jobRepository.findByStatusOrderByCreatedAtDesc(status, pageRequest);
        } else {
            result = jobRepository.findAll(pageRequest);
        }

        // [NEW] 사용자 정보 일괄 조회
        Set<String> userIds = result.getContent().stream()
                .map(GenerateJobEntity::getUserId)
                .collect(Collectors.toSet());

        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return result.map(job -> {
            AdminJobDto dto = AdminJobDto.from(job);
            User user = userMap.get(job.getUserId());
            if (user != null) {
                dto.setUserInfo(AdminJobDto.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .nickname(user.getNickname())
                        .build());
            }
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public AdminJobDto getJob(String jobId) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));
        return AdminJobDto.from(job);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getJobLogs(String jobId) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));

        return Map.of(
                "jobId", job.getId(),
                "status", job.getStatus(),
                "stage", job.getStage(),
                "errorMessage", job.getErrorMessage() == null ? "None" : job.getErrorMessage(),
                "createdAt", job.getCreatedAt(),
                "updatedAt", job.getUpdatedAt(),
                "history", "Detailed logs not persisted yet");
    }

    @Transactional
    public AdminJobDto retryJob(String jobId, JobStage fromStage) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));

        if (!job.canRetry()) {
            throw new IllegalStateException("Retry not allowed. status=" + job.getStatus());
        }
        if (!(job.getStatus() == JobStatus.FAILED || job.getStatus() == JobStatus.CANCELED)) {
            throw new IllegalStateException("Retry is allowed only for FAILED or CANCELED jobs");
        }

        job.requestRetry(fromStage);
        jobRepository.save(job);
        return AdminJobDto.from(job);
    }

    @Transactional
    public AdminJobDto cancelJob(String jobId) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));

        if (!job.canCancel()) {
            throw new IllegalStateException("Cancel not allowed. status=" + job.getStatus());
        }
        if (!(job.getStatus() == JobStatus.QUEUED || job.getStatus() == JobStatus.RUNNING)) {
            throw new IllegalStateException("Cancel is allowed only for QUEUED or RUNNING jobs");
        }

        // NOTE: RUNNING인 경우 DB만 바꾸면 워커가 실제로 멈추진 않음.
        // 추후 워커 취소 플래그/큐 취소 연동 필요.
        job.markCanceled("Admin cancelled");
        jobRepository.save(job);
        return AdminJobDto.from(job);
    }

}
