package com.brickers.backend.analytics.dto;

public record AnalyticsSummaryResponse(
        long activeUsers,
        long pageViews,
        long sessions) {
}
