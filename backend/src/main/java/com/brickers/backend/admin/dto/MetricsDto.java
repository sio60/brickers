package com.brickers.backend.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 트래픽/에러 통계 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricsDto {
    private long totalRequests; // 총 요청 수 (추정: 총 Job 수)
    private long totalErrors; // 총 에러 수 (추정: 실패 Job 수)
    private double errorRate; // 에러율 (%)

    // Job 기반 통계
    private long queuedJobs;
    private long runningJobs;
    private long completedJobs;
    private long failedJobs;
    private long canceledJobs;

    // 최근 24시간 통계
    private long recentSuccessCount;
    private long recentFailureCount;
}
