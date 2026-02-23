package com.brickers.backend.analytics.dto;

import java.util.List;

public record DeepInsightResponse(
                List<CategoryStat> categoryStats,
                List<QualityStat> qualityStats,
                List<AgeStat> ageStats) {
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

        public record AgeStat(
                        String ageGroup,
                        long count) {
        }

}
