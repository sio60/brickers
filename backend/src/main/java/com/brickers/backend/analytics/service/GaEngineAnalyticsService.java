package com.brickers.backend.analytics.service;

import com.brickers.backend.analytics.dto.PerformanceResponse;
import com.brickers.backend.analytics.dto.ProductIntelligenceResponse;
import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.google.analytics.data.v1beta.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 🤖 GaEngineAnalyticsService
 * 
 * AI 브릭 생성 품질, 퍼널 분석, 이탈 지점, 성능 지표 등을 담당합니다.
 */
@Slf4j
@Service
public class GaEngineAnalyticsService extends GaBaseService {

    private final GenerateJobRepository jobRepository;

    public GaEngineAnalyticsService(GaClientProvider clientProvider, GenerateJobRepository jobRepository) {
        super(clientProvider);
        this.jobRepository = jobRepository;
    }

    public ProductIntelligenceResponse getProductIntelligence(int days) {
        if (getClient() == null)
            return null;
        return new ProductIntelligenceResponse(
                fetchFunnelStages(days),
                fetchEngineQuality(days),
                fetchExitPoints(days));
    }

    public PerformanceResponse getPerformanceDetails(int days) {
        return new PerformanceResponse(fetchFailureStats(days), fetchPerformanceStats(days));
    }

    public List<ProductIntelligenceResponse.FunnelStage> fetchFunnelStages(int days) {
        List<ProductIntelligenceResponse.FunnelStage> funnel = new ArrayList<>();
        try {
            RunReportRequest request = buildBasicRequest(days)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:funnel_stage"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .build();

            for (Row row : getClient().runReport(request).getRowsList()) {
                String stage = row.getDimensionValues(0).getValue();
                if (stage == null || stage.isEmpty() || stage.equals("(not set)")) {
                    continue;
                }
                funnel.add(new ProductIntelligenceResponse.FunnelStage(stage,
                        Long.parseLong(row.getMetricValues(0).getValue())));
            }
            funnel.sort(java.util.Comparator.comparing(ProductIntelligenceResponse.FunnelStage::stage));
        } catch (Exception e) {
            log.warn("Failed to fetch Funnel Analysis: {}", e.getMessage());
        }
        return funnel;
    }

    public ProductIntelligenceResponse.EngineQuality fetchEngineQuality(int days) {
        try {
            RunReportRequest request = buildBasicRequest(days)
                    .addMetrics(Metric.newBuilder().setName("customEvent:stability_score"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:brick_count"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:lmm_latency"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:wait_time"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(createDimensionFilter("eventName", "generate_success", false))
                    .build();

            RunReportResponse response = getClient().runReport(request);
            if (response.getRowsCount() > 0) {
                Row row = response.getRows(0);
                long count = Long.parseLong(row.getMetricValues(5).getValue());
                if (count == 0)
                    return null;

                TodayMetrics today = calculateTodayMetrics();

                return new ProductIntelligenceResponse.EngineQuality(
                        Double.parseDouble(row.getMetricValues(0).getValue()) / count,
                        Double.parseDouble(row.getMetricValues(1).getValue()) / count,
                        Double.parseDouble(row.getMetricValues(2).getValue()) / count,
                        Double.parseDouble(row.getMetricValues(3).getValue()) / count,
                        Double.parseDouble(row.getMetricValues(4).getValue()) / count,
                        Double.parseDouble(row.getMetricValues(4).getValue()),
                        today.avgCost,
                        today.avgToken,
                        today.avgWaitTime);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Engine Quality: {}", e.getMessage());
        }
        return null;
    }

    public List<ProductIntelligenceResponse.ExitPoint> fetchExitPoints(int days) {
        List<ProductIntelligenceResponse.ExitPoint> exits = new ArrayList<>();
        try {
            RunReportRequest request = buildBasicRequest(days)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:exit_step"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .build();

            for (Row row : getClient().runReport(request).getRowsList()) {
                String step = row.getDimensionValues(0).getValue();
                exits.add(new ProductIntelligenceResponse.ExitPoint(step,
                        Long.parseLong(row.getMetricValues(0).getValue())));
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Exit Points: {}", e.getMessage());
        }
        return exits;
    }

    public List<PerformanceResponse.FailureStat> fetchFailureStats(int days) {
        List<PerformanceResponse.FailureStat> stats = new ArrayList<>();
        try {
            RunReportRequest request = buildBasicRequest(days)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:error_type"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(createDimensionFilter("eventName", "generate_fail", false))
                    .build();

            for (Row row : getClient().runReport(request).getRowsList()) {
                String reason = row.getDimensionValues(0).getValue();
                if (reason.isEmpty() || reason.equals("(not set)"))
                    reason = "Unknown";
                stats.add(new PerformanceResponse.FailureStat(reason,
                        Integer.parseInt(row.getMetricValues(0).getValue())));
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Failure Stats: {}", e.getMessage());
        }
        return stats;
    }

    public PerformanceResponse.PerformanceStat fetchPerformanceStats(int days) {
        try {
            RunReportRequest request = buildBasicRequest(days)
                    .addMetrics(Metric.newBuilder().setName("customEvent:wait_time_at_moment"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:token_count"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:brick_count"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(createDimensionFilter("eventName", "generate_success", false))
                    .build();

            RunReportResponse response = getClient().runReport(request);
            if (response.getRowsCount() > 0) {
                Row row = response.getRows(0);
                long count = Long.parseLong(row.getMetricValues(4).getValue());
                if (count == 0)
                    return null;

                TodayMetrics today = calculateTodayMetrics();

                return new PerformanceResponse.PerformanceStat(
                        Double.parseDouble(row.getMetricValues(0).getValue()) / count,
                        Double.parseDouble(row.getMetricValues(1).getValue()) / count,
                        Double.parseDouble(row.getMetricValues(1).getValue()),
                        Double.parseDouble(row.getMetricValues(3).getValue()) / count,
                        Double.parseDouble(row.getMetricValues(2).getValue()),
                        today.avgCost,
                        today.avgToken,
                        today.avgWaitTime);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Performance Stats : {}", e.getMessage());
        }
        return null;

    }

    private TodayMetrics calculateTodayMetrics() {
        LocalDateTime start = LocalDateTime.now().with(LocalTime.MIN);
        LocalDateTime end = LocalDateTime.now().with(LocalTime.MAX);
        List<GenerateJobEntity> todayJobs = jobRepository.findByCreatedAtBetween(start, end).stream()
                .filter(j -> j.getStatus() == JobStatus.DONE)
                .collect(Collectors.toList());

        if (todayJobs.isEmpty())
            return new TodayMetrics(0, 0, 0);

        double totalCost = todayJobs.stream().mapToDouble(j -> j.getEstCost() != null ? j.getEstCost() : 0)
                .sum();
        double totalTokens = todayJobs.stream()
                .mapToDouble(j -> j.getTokenCount() != null ? j.getTokenCount().doubleValue() : 0)
                .sum();
        double totalWait = todayJobs.stream()
                .mapToDouble(j -> (j.getCreatedAt() != null && j.getUpdatedAt() != null)
                        ? java.time.Duration.between(j.getCreatedAt(), j.getUpdatedAt()).getSeconds()
                        : 0)
                .sum();

        return new TodayMetrics(totalCost / todayJobs.size(), totalTokens / todayJobs.size(),
                totalWait / todayJobs.size());
    }

    private static class TodayMetrics {
        final double avgCost;
        final double avgToken;
        final double avgWaitTime;

        TodayMetrics(double avgCost, double avgToken, double avgWaitTime) {
            this.avgCost = avgCost;
            this.avgToken = avgToken;
            this.avgWaitTime = avgWaitTime;
        }
    }
}
