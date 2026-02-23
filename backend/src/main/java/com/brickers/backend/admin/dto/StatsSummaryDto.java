package com.brickers.backend.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 전체 통계 요약 DTO (유저/게시글/결제)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsSummaryDto {
    private long totalUsers;
    private long newUsersToday;
    private long newUsersThisWeek;
    private long totalPosts;
    private long totalPayments;
    private long totalRevenue;
    private long activeJobs;
    private long completedJobs;
    private long failedJobs;
    private double totalEstCost; // [New] 전체 누적 AI 비용 (USD)
    private long totalTokens; // [New] 전체 누적 토큰
}
