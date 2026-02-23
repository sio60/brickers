package com.brickers.backend.analytics.dto;

import java.util.List;

public record PerformanceResponse(
                List<FailureStat> failureStats,
                PerformanceStat performance) {
        public record FailureStat(
                        String reason,
                        long count) {
        }

        public record PerformanceStat(
                        double avgWaitTime,
                        double avgCost,
                        double totalCost,
                        double avgBrickCount,
                        double tokenCount,
                        double avgCostToday,
                        double avgTokenToday,
                        double avgWaitTimeToday) {
        }
}
