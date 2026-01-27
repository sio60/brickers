package com.brickers.backend.admin.metrics.service;

import com.brickers.backend.admin.metrics.dto.MetricsDto;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 트래픽/메트릭 통계 서비스
 */
@Service
@RequiredArgsConstructor
public class AdminMetricsService {

    private final GenerateJobRepository jobRepository;

    /**
     * 전체 메트릭 통계 조회
     * - 현재는 Job 기반 통계 제공 (추후 Micrometer/Actuator 연동 가능)
     */
    public MetricsDto getMetrics() {
        long total = jobRepository.count();
        long queued = jobRepository.countByStatus(JobStatus.QUEUED);
        long running = jobRepository.countByStatus(JobStatus.RUNNING);
        long completed = jobRepository.countByStatus(JobStatus.DONE);
        long failed = jobRepository.countByStatus(JobStatus.FAILED);
        long canceled = jobRepository.countByStatus(JobStatus.CANCELED);

        // 최근 24시간 통계
        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
        long recentSuccess = jobRepository.countByStatusAndUpdatedAtAfter(JobStatus.DONE, oneDayAgo);
        long recentFailed = jobRepository.countByStatusAndUpdatedAtAfter(JobStatus.FAILED, oneDayAgo);

        double errorRate = total > 0 ? (double) failed / total * 100 : 0;

        return MetricsDto.builder()
                .totalRequests(total)
                .totalErrors(failed)
                .errorRate(Math.round(errorRate * 100.0) / 100.0)
                .queuedJobs(queued)
                .runningJobs(running)
                .completedJobs(completed)
                .failedJobs(failed)
                .canceledJobs(canceled)
                .recentSuccessCount(recentSuccess)
                .recentFailureCount(recentFailed)
                .build();
    }
}
