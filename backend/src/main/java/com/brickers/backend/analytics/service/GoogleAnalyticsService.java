package com.brickers.backend.analytics.service;

import com.brickers.backend.analytics.dto.*;
import com.brickers.backend.analytics.dto.PerformanceResponse.FailureStat;
import com.brickers.backend.analytics.dto.PerformanceResponse.PerformanceStat;
import com.google.analytics.data.v1beta.*;
import com.google.auth.oauth2.ServiceAccountCredentials;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Slf4j
@Service
public class GoogleAnalyticsService {

    @Value("${google.analytics.property-id}")
    private String propertyId;

    @Value("${google.analytics.credentials-json}")
    private String credentialsJson;

    private BetaAnalyticsDataClient analyticsDataClient;

    @PostConstruct
    public void init() throws IOException {
        if (credentialsJson == null || credentialsJson.isEmpty()) {
            log.warn("GA4 credentials not found. Analytics features will be disabled.");
            return;
        }

        ServiceAccountCredentials credentials = ServiceAccountCredentials.fromStream(
                new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8)));

        BetaAnalyticsDataSettings settings = BetaAnalyticsDataSettings.newBuilder()
                .setCredentialsProvider(() -> credentials)
                .build();

        this.analyticsDataClient = BetaAnalyticsDataClient.create(settings);
        log.info("GA4 Analytics Data Client initialized.");
    }

    /**
     * 최근 N일간의 활성 사용자 수를 조회합니다.
     */
    public long getActiveUsers(int days) throws IOException {
        return getMetricSum(days, "activeUsers");
    }

    /**
     * 최근 N일간의 총 페이지 뷰 수를 조회합니다.
     */
    public long getPageViews(int days) throws IOException {
        return getMetricSum(days, "screenPageViews");
    }

    /**
     * 최근 N일간의 총 세션 수를 조회합니다.
     */
    public long getSessions(int days) throws IOException {
        return getMetricSum(days, "sessions");
    }

    /**
     * 최근 N일간 가장 많이 방문한 페이지 순위를 조회합니다.
     */
    public List<TopPageResponse> getTopPages(int days, int limit) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        RunReportRequest request = RunReportRequest.newBuilder()
                .setProperty("properties/" + propertyId)
                .addDimensions(Dimension.newBuilder().setName("pagePath"))
                .addMetrics(Metric.newBuilder().setName("screenPageViews"))
                .addMetrics(Metric.newBuilder().setName("userEngagementDuration"))
                .addDateRanges(DateRange.newBuilder()
                        .setStartDate(days + "daysAgo")
                        .setEndDate("today"))
                .setLimit(limit)
                .build();

        RunReportResponse response = analyticsDataClient.runReport(request);
        List<TopPageResponse> result = new ArrayList<>();

        for (Row row : response.getRowsList()) {
            long views = Long.parseLong(row.getMetricValues(0).getValue());
            double totalDuration = Double.parseDouble(row.getMetricValues(1).getValue());
            double avgDuration = views > 0 ? totalDuration / views : 0;

            result.add(new TopPageResponse(
                    row.getDimensionValues(0).getValue(),
                    views,
                    avgDuration));
        }
        return result;
    }

    /**
     * 최근 N일간의 일별 활성 사용자 수(DAU) 트렌드를 조회합니다.
     */
    public List<DailyTrendResponse> getDailyActiveUsers(int days) throws IOException {
        return getDailyMetricTrend(days, "activeUsers");
    }

    /**
     * 최근 N일간의 일별 특정 이벤트 발생 횟수 트렌드를 조회합니다.
     */
    public List<DailyTrendResponse> getDailyEventStats(int days, String eventName) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        RunReportRequest request = RunReportRequest.newBuilder()
                .setProperty("properties/" + propertyId)
                .addDimensions(Dimension.newBuilder().setName("date"))
                .addMetrics(Metric.newBuilder().setName("eventCount"))
                .setDimensionFilter(FilterExpression.newBuilder()
                        .setFilter(Filter.newBuilder()
                                .setFieldName("eventName")
                                .setStringFilter(Filter.StringFilter.newBuilder()
                                        .setValue(eventName))
                                .build())
                        .build())
                .addDateRanges(DateRange.newBuilder()
                        .setStartDate(days + "daysAgo")
                        .setEndDate("today"))
                .build();

        return processTrendResponse(analyticsDataClient.runReport(request));
    }

    private List<DailyTrendResponse> getDailyMetricTrend(int days, String metricName) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        RunReportRequest request = RunReportRequest.newBuilder()
                .setProperty("properties/" + propertyId)
                .addDimensions(Dimension.newBuilder().setName("date"))
                .addMetrics(Metric.newBuilder().setName(metricName))
                .addDateRanges(DateRange.newBuilder()
                        .setStartDate(days + "daysAgo")
                        .setEndDate("today"))
                .build();

        return processTrendResponse(analyticsDataClient.runReport(request));
    }

    private List<DailyTrendResponse> processTrendResponse(RunReportResponse response) {
        List<DailyTrendResponse> result = new ArrayList<>();
        for (Row row : response.getRowsList()) {
            result.add(new DailyTrendResponse(
                    row.getDimensionValues(0).getValue(),
                    Long.parseLong(row.getMetricValues(0).getValue())));
        }
        return result;
    }

    /**
     * 특정 유저의 최근 상호작용 데이터를 조회합니다.
     */
    public List<Map<String, Object>> getUserActivity(String userId, int days) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        try {
            RunReportRequest request = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("eventName"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("customUser:userId")
                                    .setStringFilter(Filter.StringFilter.newBuilder()
                                            .setValue(userId)) // 주의: 여기서 userId 변수는 이제 닉네임을 담게 됨
                                    .build())
                            .build())
                    .addDateRanges(DateRange.newBuilder()
                            .setStartDate(days + "daysAgo")
                            .setEndDate("today"))
                    .build();

            RunReportResponse response = analyticsDataClient.runReport(request);
            List<Map<String, Object>> result = new ArrayList<>();
            for (Row row : response.getRowsList()) {
                result.add(Map.of(
                        "eventName", row.getDimensionValues(0).getValue(),
                        "count", Long.parseLong(row.getMetricValues(0).getValue())));
            }
            return result;
        } catch (Exception e) {
            log.warn("Failed to get user activity (userId might be invalid): {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 인기 태그 순위를 조회합니다. (generate_success 이벤트 추천 태그 기반)
     */
    public List<TopTagResponse> getTopTags(int days, int limit) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        // 1. Fetch raw tag strings (comma separated)
        RunReportRequest request = RunReportRequest.newBuilder()
                .setProperty("properties/" + propertyId)
                .addDimensions(Dimension.newBuilder().setName("customEvent:suggested_tags"))
                .addMetrics(Metric.newBuilder().setName("eventCount"))
                .setDimensionFilter(FilterExpression.newBuilder()
                        .setFilter(Filter.newBuilder()
                                .setFieldName("eventName")
                                .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_success"))
                                .build()))
                .addDateRanges(DateRange.newBuilder()
                        .setStartDate(days + "daysAgo")
                        .setEndDate("today"))
                .setLimit(100) // Fetch more to aggregate
                .build();

        RunReportResponse response = analyticsDataClient.runReport(request);

        // 2. Split and Aggregate
        Map<String, Long> tagCounts = new HashMap<>();
        for (Row row : response.getRowsList()) {
            String tagString = row.getDimensionValues(0).getValue();
            long count = Long.parseLong(row.getMetricValues(0).getValue());

            if (tagString == null || tagString.isEmpty() || tagString.equals("(not set)"))
                continue;

            String[] tags = tagString.split(",");
            for (String tag : tags) {
                String cleanTag = tag.trim();
                if (!cleanTag.isEmpty()) {
                    tagCounts.put(cleanTag, tagCounts.getOrDefault(cleanTag, 0L) + count);
                }
            }
        }

        // 3. Sort and Limit
        List<TopTagResponse> result = new ArrayList<>();
        tagCounts.entrySet().stream()
                .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                .limit(limit)
                .forEach(e -> result.add(new TopTagResponse(e.getKey(), e.getValue())));

        return result;
    }

    /**
     * 활동량이 가장 많은 상위 사용자들을 조회합니다.
     */
    public List<HeavyUserResponse> getHeavyUsers(int days, int limit) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        // Try nickname first (more likely to be registered based on logs)
        try {
            RunReportRequest request = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customUser:nickname"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder()
                            .setStartDate(days + "daysAgo")
                            .setEndDate("today"))
                    .setLimit(limit)
                    .build();

            RunReportResponse response = analyticsDataClient.runReport(request);
            List<HeavyUserResponse> result = new ArrayList<>();
            for (Row row : response.getRowsList()) {
                String name = row.getDimensionValues(0).getValue();
                if (name.isEmpty() || name.equals("(not set)"))
                    continue;

                result.add(new HeavyUserResponse(name, Long.parseLong(row.getMetricValues(0).getValue())));
            }
            return result;
        } catch (Exception e) {
            log.warn("Failed to get heavy users with customUser:nickname. Retrying with customUser:userId. Error: {}",
                    e.getMessage());
            try {
                RunReportRequest fallbackRequest = RunReportRequest.newBuilder()
                        .setProperty("properties/" + propertyId)
                        .addDimensions(Dimension.newBuilder().setName("customUser:userId"))
                        .addMetrics(Metric.newBuilder().setName("eventCount"))
                        .addDateRanges(DateRange.newBuilder()
                                .setStartDate(days + "daysAgo")
                                .setEndDate("today"))
                        .setLimit(limit)
                        .build();

                RunReportResponse fallbackResp = analyticsDataClient.runReport(fallbackRequest);
                List<HeavyUserResponse> result = new ArrayList<>();
                for (Row row : fallbackResp.getRowsList()) {
                    String uid = row.getDimensionValues(0).getValue();
                    if (uid.isEmpty() || uid.equals("(not set)"))
                        continue;

                    result.add(new HeavyUserResponse(uid, Long.parseLong(row.getMetricValues(0).getValue())));
                }
                return result;
            } catch (Exception ex) {
                log.error("Failed to get heavy users (Retry failed): {}", ex.getMessage());
                return new ArrayList<>();
            }
        }
    }

    private long getMetricSum(int days, String metricName) throws IOException {
        if (analyticsDataClient == null)
            return 0;

        RunReportRequest request = RunReportRequest.newBuilder()
                .setProperty("properties/" + propertyId)
                .addMetrics(Metric.newBuilder().setName(metricName))
                .addDateRanges(DateRange.newBuilder()
                        .setStartDate(days + "daysAgo")
                        .setEndDate("today"))
                .build();

        RunReportResponse response = analyticsDataClient.runReport(request);

        long total = 0;
        for (Row row : response.getRowsList()) {
            total += Long.parseLong(row.getMetricValues(0).getValue());
        }
        return total;
    }

    /**
     * AI Agent용 통합 리포트 데이터 조회 (Batch Request 사용)
     */
    public FullReportResponse getProposalFullReport(int days) {
        if (analyticsDataClient == null)
            return null;

        AnalyticsSummaryResponse summary = null;
        List<DailyTrendResponse> dailyUsers = new ArrayList<>();
        List<TopPageResponse> topPages = new ArrayList<>();
        List<TopTagResponse> topTags = new ArrayList<>();
        ProductIntelligenceResponse productIntelligence = null;
        List<HeavyUserResponse> heavyUsers = new ArrayList<>();
        Map<String, List<DailyTrendResponse>> eventStats = new HashMap<>();

        try {
            // Batch 1: 핵심 지표 (Summary, Trends, Top Pages, Top Tags)
            List<RunReportRequest> requests1 = new ArrayList<>();
            requests1.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addMetrics(Metric.newBuilder().setName("activeUsers"))
                    .addMetrics(Metric.newBuilder().setName("screenPageViews"))
                    .addMetrics(Metric.newBuilder().setName("sessions"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build());

            requests1.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("date"))
                    .addMetrics(Metric.newBuilder().setName("activeUsers"))
                    .addDateRanges(DateRange.newBuilder().setStartDate((days * 2) + "daysAgo").setEndDate("today"))
                    .build());

            requests1.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("pagePath"))
                    .addMetrics(Metric.newBuilder().setName("screenPageViews"))
                    .addMetrics(Metric.newBuilder().setName("userEngagementDuration"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(10)
                    .build());

            requests1.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:suggested_tags"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName")
                                    .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_success"))
                                    .build()))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(100)
                    .build());

            BatchRunReportsResponse batchResponse1 = analyticsDataClient
                    .batchRunReports(BatchRunReportsRequest.newBuilder()
                            .setProperty("properties/" + propertyId).addAllRequests(requests1).build());

            if (batchResponse1.getReportsCount() >= 4) {
                RunReportResponse r1 = batchResponse1.getReports(0);
                if (r1.getRowsCount() > 0) {
                    Row row = r1.getRows(0);
                    summary = new AnalyticsSummaryResponse(
                            Long.parseLong(row.getMetricValues(0).getValue()),
                            Long.parseLong(row.getMetricValues(1).getValue()),
                            Long.parseLong(row.getMetricValues(2).getValue()));
                }
                dailyUsers = processTrendResponse(batchResponse1.getReports(1));

                for (Row row : batchResponse1.getReports(2).getRowsList()) {
                    long views = Long.parseLong(row.getMetricValues(0).getValue());
                    double totalDuration = Double.parseDouble(row.getMetricValues(1).getValue());
                    double avgDuration = views > 0 ? totalDuration / views : 0;
                    topPages.add(new TopPageResponse(row.getDimensionValues(0).getValue(), views, avgDuration));
                }

                // Aggregating Tags from Batch Response
                Map<String, Long> tagCounts = new HashMap<>();
                for (Row row : batchResponse1.getReports(3).getRowsList()) {
                    String tagString = row.getDimensionValues(0).getValue();
                    long count = Long.parseLong(row.getMetricValues(0).getValue());

                    if (tagString == null || tagString.isEmpty() || tagString.equals("(not set)"))
                        continue;

                    String[] tags = tagString.split(",");
                    for (String tag : tags) {
                        String cleanTag = tag.trim();
                        if (!cleanTag.isEmpty()) {
                            tagCounts.put(cleanTag, tagCounts.getOrDefault(cleanTag, 0L) + count);
                        }
                    }
                }
                tagCounts.entrySet().stream()
                        .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                        .limit(10)
                        .forEach(e -> topTags.add(new TopTagResponse(e.getKey(), e.getValue())));
            }
        } catch (Exception e) {
            log.error("Failed to get Batch 1 (Summary/Tags) report: {}", e.getMessage());
        }

        // Batch 2: Event Stats
        try {
            List<RunReportRequest> requestsStats = new ArrayList<>();
            requestsStats.add(buildEventRequest("generate_fail", days));
            requestsStats.add(buildEventRequest("generate_success", days));
            requestsStats.add(buildEventRequest("gallery_register_attempt", 1));

            BatchRunReportsResponse batchResponse2 = analyticsDataClient
                    .batchRunReports(BatchRunReportsRequest.newBuilder()
                            .setProperty("properties/" + propertyId).addAllRequests(requestsStats).build());

            if (batchResponse2.getReportsCount() >= 3) {
                List<DailyTrendResponse> fail7d = processTrendResponse(batchResponse2.getReports(0));
                List<DailyTrendResponse> success7d = processTrendResponse(batchResponse2.getReports(1));
                List<DailyTrendResponse> gallery1d = processTrendResponse(batchResponse2.getReports(2));

                eventStats.put("fail_7d", fail7d);
                eventStats.put("success_7d", success7d);
                eventStats.put("fail_1d", fail7d.isEmpty() ? List.of() : List.of(fail7d.get(fail7d.size() - 1)));
                eventStats.put("success_1d",
                        success7d.isEmpty() ? List.of() : List.of(success7d.get(success7d.size() - 1)));
                eventStats.put("gallery_attempt_1d", gallery1d);
            }
        } catch (Exception e) {
            log.error("Failed to fetch Event Stats: {}", e.getMessage());
        }

        // Batch 3: Heavy Users (Isolated because customUser:userId might be
        // unregistered)
        try {
            RunReportRequest heavyRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customUser:userId"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(5)
                    .build();

            RunReportResponse heavyResp = analyticsDataClient.runReport(heavyRequest);
            for (Row row : heavyResp.getRowsList()) {
                String uid = row.getDimensionValues(0).getValue();
                if (!uid.isEmpty() && !uid.equals("(not set)")) {
                    heavyUsers.add(new HeavyUserResponse(uid, Long.parseLong(row.getMetricValues(0).getValue())));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Heavy Users (likely unregistered customUser:userId): {}", e.getMessage());
        }

        // 3. [NEW] Product Intelligence
        try {
            productIntelligence = getProductIntelligence(days);
        } catch (Exception e) {
            log.warn("Failed to fetch Product Intelligence: {}", e.getMessage());
        }

        return new FullReportResponse(summary, dailyUsers, topPages, topTags, productIntelligence, heavyUsers,
                eventStats);
    }

    /**
     * [NEW] 제품 인텔리전스 전용 데이터 조회
     */
    public ProductIntelligenceResponse getProductIntelligence(int days) {
        if (analyticsDataClient == null)
            return null;

        List<ProductIntelligenceResponse.FunnelStage> funnel = new ArrayList<>();
        ProductIntelligenceResponse.EngineQuality quality = null;
        List<ProductIntelligenceResponse.ExitPoint> exits = new ArrayList<>();

        // 1. Funnel Analysis (Independent Try-Catch)
        // [FIX] 커스텀 측정기준 등록 누락 문제를 방지하기 위해 eventName = funnel_* 로 직접 쿼리
        try {
            RunReportRequest funnelRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("eventName"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName")
                                    .setStringFilter(Filter.StringFilter.newBuilder()
                                            .setMatchType(Filter.StringFilter.MatchType.BEGINS_WITH)
                                            .setValue("funnel_")
                                            .build())
                                    .build())
                            .build())
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse funnelResp = analyticsDataClient.runReport(funnelRequest);

            for (Row row : funnelResp.getRowsList()) {
                String fullEventName = row.getDimensionValues(0).getValue();
                String stage = fullEventName.startsWith("funnel_") ? fullEventName.substring(7) : fullEventName;
                funnel.add(new ProductIntelligenceResponse.FunnelStage(
                        stage,
                        Long.parseLong(row.getMetricValues(0).getValue())));
            }
            // 스테이지 순서대로 정렬 (01_, 02_ ...)
            funnel.sort(java.util.Comparator.comparing(ProductIntelligenceResponse.FunnelStage::stage));
        } catch (Exception e) {
            log.warn("Failed to fetch Funnel Analysis (eventName query fallback): {}", e.getMessage());
        }

        // 2. Engine Quality Metrics (Independent Try-Catch)
        try {
            RunReportRequest qRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addMetrics(Metric.newBuilder().setName("customEvent:stability_score"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:brick_count"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:lmm_latency"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:wait_time"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName") // Only successful generations
                                    .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_success"))
                                    .build()))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse qResp = analyticsDataClient.runReport(qRequest);

            if (qResp.getRowsCount() > 0) {
                Row row = qResp.getRows(0);
                double stability = Double.parseDouble(row.getMetricValues(0).getValue());
                double bricks = Double.parseDouble(row.getMetricValues(1).getValue());
                double latency = Double.parseDouble(row.getMetricValues(2).getValue());
                double wait = Double.parseDouble(row.getMetricValues(3).getValue());
                double cost = Double.parseDouble(row.getMetricValues(4).getValue());
                long count = Long.parseLong(row.getMetricValues(5).getValue());

                log.info("📊 [GA4 Quality Metrics] Count: {}, RawCost: {}", count, cost);

                if (count > 0) {
                    double totalCost = cost;
                    // If total sum is large, scale it to dollars first
                    if (totalCost > 100.0)
                        totalCost = totalCost / 1_000_000.0;

                    quality = new ProductIntelligenceResponse.EngineQuality(
                            stability / count,
                            bricks / count,
                            latency / count,
                            wait / count,
                            totalCost / count); // Use Average Cost
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Engine Quality (likely unregistered metric): {}", e.getMessage());
        }

        // 3. Exit Point Analysis (Independent Try-Catch)
        // [FIX] eventName = exit_* 로 직접 쿼리
        try {
            RunReportResponse exitResp = analyticsDataClient.runReport(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("eventName"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName")
                                    .setStringFilter(Filter.StringFilter.newBuilder()
                                            .setMatchType(Filter.StringFilter.MatchType.BEGINS_WITH)
                                            .setValue("exit_")
                                            .build())
                                    .build())
                            .build())
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(10).build());

            for (Row row : exitResp.getRowsList()) {
                String fullEventName = row.getDimensionValues(0).getValue();
                String step = fullEventName.startsWith("exit_") ? fullEventName.substring(5) : fullEventName;
                if (!step.isEmpty()) {
                    exits.add(new ProductIntelligenceResponse.ExitPoint(step,
                            Long.parseLong(row.getMetricValues(0).getValue())));
                }
            }
            exits.sort((a, b) -> Long.compare(b.count(), a.count())); // 이탈 횟수 내림차순 정렬
        } catch (Exception e) {
            log.warn("Failed to fetch Exit Points (eventName query fallback): {}", e.getMessage());
        }
        return new ProductIntelligenceResponse(funnel, quality, exits);
    }

    /**
     * [NEW] 심층 분석 (Deep Insights) 데이터 조회
     * 1. 카테고리별 성공/실패율
     * 2. 검색어 워드 클라우드 (Top Keywords)
     */
    public DeepInsightResponse getDeepInsights(int days) {
        if (analyticsDataClient == null)
            return null;

        log.info("📊 [GA4] Entering getDeepInsights ({} days)", days);
        List<DeepInsightResponse.CategoryStat> categoryStats = new ArrayList<>();
        List<DeepInsightResponse.QualityStat> qualityStats = new ArrayList<>();

        // 1. Category Success Rate
        try {
            RunReportRequest categoryRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:image_category"))
                    .addDimensions(Dimension.newBuilder().setName("eventName"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName")
                                    .setInListFilter(Filter.InListFilter.newBuilder()
                                            .addValues("generate_success")
                                            .addValues("generate_fail")
                                            .build())
                                    .build())
                            .build())
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse catResp = analyticsDataClient.runReport(categoryRequest);
            log.info("   [GA4 Deep] Category query success. Rows: {}", catResp.getRowsCount());
            Map<String, long[]> catMap = new HashMap<>();

            for (Row row : catResp.getRowsList()) {
                String category = row.getDimensionValues(0).getValue();
                String eventName = row.getDimensionValues(1).getValue();
                long count = Long.parseLong(row.getMetricValues(0).getValue());
                catMap.putIfAbsent(category, new long[] { 0, 0 });
                if (eventName.equals("generate_success")) {
                    catMap.get(category)[0] += count;
                } else {
                    catMap.get(category)[1] += count;
                }
            }
            catMap.forEach((k, v) -> {
                if (!k.isEmpty() && !k.equals("(not set)")) {
                    categoryStats.add(new DeepInsightResponse.CategoryStat(k, v[0], v[1]));
                }
            });
        } catch (Exception e) {
            log.warn("   [GA4 Deep] FAILED to fetch Category Stats (Custom dim 'image_category' might be missing): {}",
                    e.getMessage());
        }

        return new DeepInsightResponse(categoryStats, qualityStats);
    }

    /**
     * [NEW] 일별 브릭 생성 활성화 수 (Daily Generation Trend)
     */
    public List<DailyTrendResponse> getGenerationTrend(int days) {
        if (analyticsDataClient == null)
            return Collections.emptyList();

        try {
            RunReportRequest request = buildEventRequest("generate_success", days);
            RunReportResponse response = analyticsDataClient.runReport(request);
            return processTrendResponse(response);
        } catch (Exception e) {
            log.error("Failed to get generation trend: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private RunReportRequest buildEventRequest(String eventName, int days) {
        return RunReportRequest.newBuilder()
                .setProperty("properties/" + propertyId)
                .addDimensions(Dimension.newBuilder().setName("date"))
                .addMetrics(Metric.newBuilder().setName("eventCount"))
                .setDimensionFilter(FilterExpression.newBuilder()
                        .setFilter(Filter.newBuilder()
                                .setFieldName("eventName")
                                .setStringFilter(Filter.StringFilter.newBuilder().setValue(eventName))
                                .build())
                        .build())
                .addDateRanges(DateRange.newBuilder()
                        .setStartDate(days + "daysAgo")
                        .setEndDate("today")
                        .build())
                .build();
    }

    /**
     * [NEW] 상세 성능 지표 (Failure Reasons & Performance Metrics)
     */
    public PerformanceResponse getPerformanceDetails(int days) {
        if (analyticsDataClient == null)
            return null;

        log.info("📊 [GA4] Entering getPerformanceDetails ({} days)", days);
        List<FailureStat> failureStats = new ArrayList<>();
        PerformanceStat performance = new PerformanceResponse.PerformanceStat(0, 0, 0, 0);

        // 1. Failure Analysis (By error_type)
        try {
            RunReportRequest failRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:error_type"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName")
                                    .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_fail"))
                                    .build()))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse failResp = analyticsDataClient.runReport(failRequest);
            log.info("   [GA4 Performance] Failure query success. Rows: {}", failResp.getRowsCount());
            for (Row row : failResp.getRowsList()) {
                String reason = row.getDimensionValues(0).getValue();
                if (!reason.isEmpty() && !reason.equals("(not set)")) {
                    failureStats.add(new PerformanceResponse.FailureStat(
                            reason,
                            Long.parseLong(row.getMetricValues(0).getValue())));
                }
            }
        } catch (Exception e) {
            log.warn(
                    "   [GA4 Performance] FAILED to fetch Failure Stats (Custom dim 'error_type' might be missing): {}",
                    e.getMessage());
        }

        // 2. Performance Metrics - Attempt 1 (All metrics)
        try {
            RunReportRequest perfRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addMetrics(Metric.newBuilder().setName("customEvent:wait_time"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:brick_count"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:token_count"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName")
                                    .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_success"))
                                    .build()))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse perfResp = analyticsDataClient.runReport(perfRequest);
            if (!perfResp.getRowsList().isEmpty()) {
                Row row = perfResp.getRowsList().get(0);
                log.info("   [GA4 Performance] Success fetching Wait, Cost, Bricks, Tokens.");
                performance = calculatePerformanceStat(row, 0, 1, 2, 3, 4);
            }
        } catch (Exception e) {
            log.warn("   [GA4 Performance] FAILED fetching all metrics together. Retrying with safe ones... Error: {}",
                    e.getMessage());
            // Attempt 2 (Safe metrics only)
            try {
                RunReportRequest safeRequest = RunReportRequest.newBuilder()
                        .setProperty("properties/" + propertyId)
                        .addMetrics(Metric.newBuilder().setName("customEvent:wait_time"))
                        .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                        .addMetrics(Metric.newBuilder().setName("customEvent:brick_count"))
                        .addMetrics(Metric.newBuilder().setName("eventCount"))
                        .setDimensionFilter(FilterExpression.newBuilder()
                                .setFilter(Filter.newBuilder()
                                        .setFieldName("eventName")
                                        .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_success"))
                                        .build()))
                        .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                        .build();

                RunReportResponse safeResp = analyticsDataClient.runReport(safeRequest);
                if (!safeResp.getRowsList().isEmpty()) {
                    Row row = safeResp.getRowsList().get(0);
                    performance = calculatePerformanceStat(row, 0, 1, 2, -1, 3);
                    log.info("   [GA4 Performance] Safe metrics fetched successfully.");
                }
            } catch (Exception ex2) {
                log.error("   [GA4 Performance] CRITICAL FAILURE: Could not even fetch safe metrics. {}",
                        ex2.getMessage());
            }
        }

        return new PerformanceResponse(failureStats, performance);
    }

    private PerformanceResponse.PerformanceStat calculatePerformanceStat(Row row, int waitIdx, int costIdx,
            int brickIdx, int tokenIdx, int countIdx) {
        try {
            int metricCount = row.getMetricValuesList().size();
            double wait = (waitIdx >= 0 && waitIdx < metricCount)
                    ? Double.parseDouble(row.getMetricValues(waitIdx).getValue())
                    : 0;
            double cost = (costIdx >= 0 && costIdx < metricCount)
                    ? Double.parseDouble(row.getMetricValues(costIdx).getValue())
                    : 0;
            double bricks = (brickIdx >= 0 && brickIdx < metricCount)
                    ? Double.parseDouble(row.getMetricValues(brickIdx).getValue())
                    : 0;
            double tokens = (tokenIdx >= 0 && tokenIdx < metricCount)
                    ? Double.parseDouble(row.getMetricValues(tokenIdx).getValue())
                    : 0;
            long count = (countIdx >= 0 && countIdx < metricCount)
                    ? Long.parseLong(row.getMetricValues(countIdx).getValue())
                    : 0;

            if (count > 0) {
                // Scaling: If total cost is high (e.g. > 1.0) and tokens exist, check if it's
                // Micros
                double totalCostDollars = cost;
                // If sum is very large (e.g. > 100), assume Micros.
                // $100 is a safe threshold for total cost of many generations in small period.
                if (totalCostDollars > 100.0) {
                    totalCostDollars = totalCostDollars / 1_000_000.0;
                }

                log.info("📈 [GA4 Performance Calc] Count: {}, SumCost: {}, SumTokens: {}, AvgWait: {}",
                        count, totalCostDollars, tokens, wait / count);

                return new PerformanceResponse.PerformanceStat(wait / count, totalCostDollars / count, bricks / count,
                        tokens / count);
            }
        } catch (Exception e) {
            log.error("Error calculating performance stat: {}", e.getMessage());
        }
        return new PerformanceResponse.PerformanceStat(0, 0, 0, 0);
    }

    public Map<String, Object> getDiagnosticInfo(int days) {
        Map<String, Object> result = new HashMap<>();
        try {
            RunReportRequest req = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();
            RunReportResponse resp = analyticsDataClient.runReport(req);
            if (resp.getRowsCount() > 0) {
                Row row = resp.getRows(0);
                result.put("raw_cost_sum", row.getMetricValues(0).getValue());
                result.put("event_count", row.getMetricValues(1).getValue());
            }
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }
}
