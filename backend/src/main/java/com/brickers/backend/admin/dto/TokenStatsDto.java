package com.brickers.backend.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 토큰/생성 통계 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenStatsDto {
    private LocalDate date;
    private long totalGenerations; // 총 도안 생성 횟수
    private long successfulGenerations; // 성공한 생성
    private long failedGenerations; // 실패한 생성
    private double successRate; // 성공률 (%)
    private long totalTokens; // [New] 총 사용 토큰
    private double totalEstCost; // [New] 총 예상 비용 (USD)
}
