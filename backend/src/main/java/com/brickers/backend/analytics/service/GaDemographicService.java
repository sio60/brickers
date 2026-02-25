package com.brickers.backend.analytics.service;

import com.brickers.backend.analytics.dto.DailyTrendResponse;
import com.brickers.backend.analytics.dto.DeepInsightResponse;
import com.google.analytics.data.v1beta.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 📊 GaDemographicService
 * 
 * 카테고리별 성공률, 연령대 분포 등 심층 통계 및 인사이트를 담당합니다.
 */
@Slf4j
@Service
public class GaDemographicService extends GaBaseService {

    public GaDemographicService(GaClientProvider clientProvider) {
        super(clientProvider);
    }

    public DeepInsightResponse getDeepInsights(int days) {
        return new DeepInsightResponse(fetchCategoryStats(days), new ArrayList<>(), fetchAgeStats(days));
    }

    public List<DailyTrendResponse> getGenerationTrend(int days) {
        List<DailyTrendResponse> result = new ArrayList<>();
        if (getClient() == null)
            return result;

        try {
            RunReportRequest request = buildBasicRequest(days)
                    .addDimensions(Dimension.newBuilder().setName("date"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(createDimensionFilter("eventName", "generate_success", false))
                    .build();

            RunReportResponse response = getClient().runReport(request);
            for (Row row : response.getRowsList()) {
                result.add(new DailyTrendResponse(row.getDimensionValues(0).getValue(),
                        Long.parseLong(row.getMetricValues(0).getValue())));
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Generation Trend: {}", e.getMessage());
        }
        return result;
    }

    public List<DeepInsightResponse.CategoryStat> fetchCategoryStats(int days) {
        List<DeepInsightResponse.CategoryStat> stats = new ArrayList<>();
        try {
            RunReportRequest request = buildBasicRequest(days)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:image_category"))
                    .addDimensions(Dimension.newBuilder().setName("eventName"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setOrGroup(FilterExpressionList.newBuilder()
                                    .addExpressions(createDimensionFilter("eventName", "generate_success", false))
                                    .addExpressions(createDimensionFilter("eventName", "generate_fail", false)))
                            .build())
                    .build();

            java.util.Map<String, long[]> map = new java.util.HashMap<>();
            for (Row row : getClient().runReport(request).getRowsList()) {
                String cat = row.getDimensionValues(0).getValue();
                if (cat.isEmpty() || cat.equals("(not set)"))
                    continue;
                String event = row.getDimensionValues(1).getValue();
                long count = Long.parseLong(row.getMetricValues(0).getValue());

                long[] counts = map.computeIfAbsent(cat, k -> new long[] { 0, 0 }); // [success, fail]
                if (event.equals("generate_success"))
                    counts[0] += count;
                else
                    counts[1] += count;
            }
            map.forEach((k, v) -> stats.add(new DeepInsightResponse.CategoryStat(k, v[0], v[1])));
        } catch (Exception e) {
            log.warn("Failed to fetch Category Stats : {}", e.getMessage());
        }
        return stats;
    }

    public List<DeepInsightResponse.AgeStat> fetchAgeStats(int days) {
        List<DeepInsightResponse.AgeStat> stats = new ArrayList<>();
        try {
            RunReportRequest request = buildBasicRequest(days)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:age"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(createDimensionFilter("eventName", "generate_success", false))
                    .build();

            for (Row row : getClient().runReport(request).getRowsList()) {
                String age = row.getDimensionValues(0).getValue();
                if (age.isEmpty() || age.equals("(not set)"))
                    continue;
                stats.add(
                        new DeepInsightResponse.AgeStat(age, (int) Long.parseLong(row.getMetricValues(0).getValue())));
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Age Stats : {}", e.getMessage());
        }
        return stats;
    }
}
