package com.brickers.backend.analytics.dto;

import java.util.List;

public record ProductIntelligenceResponse(
        List<FunnelStage> funnel,
        EngineQuality quality,
        List<ExitPoint> exits) {
    public record FunnelStage(String stage, long count) {
    }

    public record EngineQuality(double avgStability, double avgBrickCount, double avgLatency, double totalCost) {
    }

    public record ExitPoint(String step, long count) {
    }
}
