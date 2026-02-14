package com.brickers.backend.analytics.dto;

import java.util.List;

public record DeepInsightResponse(
        List<CategoryStat> categoryStats,
        List<QualityStat> qualityStats,
        List<KeywordStat> keywordStats) {
    public record CategoryStat(
            String category,
            long successCount,
            long failCount) {
    }

    public record QualityStat(
            String date,
            double avgStability,
            double avgRating) {
    }

    public record KeywordStat(
            String keyword,
            long count) {
    }
}
