package com.brickers.backend.analytics.dto;

/**
 * 📊 AnalyticsSummaryResponse
 * 
 * 대시보드 상단의 활성 유저, 페이지뷰, 세션 요약 데이터를 전달합니다.
 */
public record AnalyticsSummaryResponse(
        long activeUsers,
        long pageViews,
        long sessions) {
}
