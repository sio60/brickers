package com.brickers.backend.analytics.dto;

public record TopPageResponse(
        String pagePath,
        long pageViews,
        double avgEngagementDuration) {
}
