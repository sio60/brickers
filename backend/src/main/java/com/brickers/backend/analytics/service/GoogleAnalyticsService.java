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
     * 인기 검색어 순위를 조회합니다. (user_search 이벤트 search_term 기반)
     */
    public List<TopTagResponse> getTopKeywords(int days, int limit) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        RunReportRequest request = RunReportRequest.newBuilder()
                .setProperty("properties/" + propertyId)
                .addDimensions(Dimension.newBuilder().setName("customEvent:search_term"))
                .addMetrics(Metric.newBuilder().setName("eventCount"))
                .setDimensionFilter(FilterExpression.newBuilder()
                        .setFilter(Filter.newBuilder()
                                .setFieldName("eventName")
                                .setStringFilter(Filter.StringFilter.newBuilder().setValue("user_search"))
                                .build())
                        .build())
                .addDateRanges(DateRange.newBuilder()
                        .setStartDate(days + "daysAgo")
                        .setEndDate("today"))
                .setLimit(limit)
                .build();

        RunReportResponse response = analyticsDataClient.runReport(request);

        List<TopTagResponse> result = new ArrayList<>();
        for (Row row : response.getRowsList()) {
            String keyword = row.getDimensionValues(0).getValue();
            long count = Long.parseLong(row.getMetricValues(0).getValue());

            if (keyword != null && !keyword.isEmpty() && !keyword.equals("(not set)")) {
                result.add(new TopTagResponse(keyword, count));
            }
        }

        return result;
    }

    /**
     * 활동량이 가장 많은 상위 사용자들을 조회합니다.
     */
    public List<HeavyUserResponse> getHeavyUsers(int days, int limit) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        try {
            RunReportRequest request = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customUser:userId"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder()
                            .setStartDate(days + "daysAgo")
                            .setEndDate("today"))
                    .setLimit(limit)
                    .build();

            RunReportResponse response = analyticsDataClient.runReport(request);
            List<HeavyUserResponse> result = new ArrayList<>();
            for (Row row : response.getRowsList()) {
                String uid = row.getDimensionValues(0).getValue();
                if (uid.isEmpty() || uid.equals("(not set)"))
                    continue;

                result.add(new HeavyUserResponse(uid, Long.parseLong(row.getMetricValues(0).getValue())));
            }
            return result;
        } catch (Exception e) {
            log.warn("Failed to get heavy users with customUser:userId. Retrying with customUser:nickname. Error: {}",
                    e.getMessage());
            try {
                RunReportRequest fallbackRequest = RunReportRequest.newBuilder()
                        .setProperty("properties/" + propertyId)
                        // Fallback to nickname if userId fails
                        .addDimensions(Dimension.newBuilder().setName("customUser:nickname"))
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
        List<TopTagResponse> topKeywords = new ArrayList<>(); // [NEW] 검색어 추가
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

            // Batch 2: Heavy Users & Event Stats
            List<RunReportRequest> requests2 = new ArrayList<>();
            requests2.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customUser:userId"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(5)
                    .build());

            requests2.add(buildEventRequest("generate_fail", days));
            requests2.add(buildEventRequest("generate_success", days));
            requests2.add(buildEventRequest("gallery_register_attempt", 1));

            // [NEW] 검색어 요청 추가
            requests2.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:search_term"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName")
                                    .setStringFilter(Filter.StringFilter.newBuilder().setValue("user_search"))
                                    .build()))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(10)
                    .build());

            BatchRunReportsResponse batchResponse2 = analyticsDataClient
                    .batchRunReports(BatchRunReportsRequest.newBuilder()
                            .setProperty("properties/" + propertyId).addAllRequests(requests2).build());

            if (batchResponse2.getReportsCount() >= 4) {
                for (Row row : batchResponse2.getReports(0).getRowsList()) {
                    String uid = row.getDimensionValues(0).getValue();
                    if (!uid.isEmpty() && !uid.equals("(not set)")) {
                        heavyUsers.add(new HeavyUserResponse(uid, Long.parseLong(row.getMetricValues(0).getValue())));
                    }
                }

                List<DailyTrendResponse> fail7d = processTrendResponse(batchResponse2.getReports(1));
                List<DailyTrendResponse> success7d = processTrendResponse(batchResponse2.getReports(2));
                List<DailyTrendResponse> gallery1d = processTrendResponse(batchResponse2.getReports(3));

                eventStats.put("fail_7d", fail7d);
                eventStats.put("success_7d", success7d);
                eventStats.put("fail_1d", fail7d.isEmpty() ? List.of() : List.of(fail7d.get(fail7d.size() - 1)));
                eventStats.put("success_1d",
                        success7d.isEmpty() ? List.of() : List.of(success7d.get(success7d.size() - 1)));
                eventStats.put("gallery_attempt_1d", gallery1d);

                // [NEW] 검색어 결과 처리
                if (batchResponse2.getReportsCount() >= 5) {
                    for (Row row : batchResponse2.getReports(4).getRowsList()) {
                        String kw = row.getDimensionValues(0).getValue();
                        if (!kw.isEmpty() && !kw.equals("(not set)")) {
                            topKeywords.add(new TopTagResponse(kw, Long.parseLong(row.getMetricValues(0).getValue())));
                        }
                    }
                }
            }

        } catch (Exception e) {
            log.error("Failed to get full proposal report: {}", e.getMessage());
        }

        return new FullReportResponse(summary, dailyUsers, topPages, topTags, topKeywords, heavyUsers, eventStats);
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
        try {
            RunReportRequest funnelRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:funnel_stage"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setNotExpression(FilterExpression.newBuilder()
                                    .setFilter(Filter.newBuilder()
                                            .setFieldName("customEvent:funnel_stage")
                                            .setStringFilter(
                                                    Filter.StringFilter.newBuilder().setValue("(not set)").build())
                                            .build())
                                    .build())
                            .build())
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse funnelResp = analyticsDataClient.runReport(funnelRequest);

            for (Row row : funnelResp.getRowsList()) {
                funnel.add(new ProductIntelligenceResponse.FunnelStage(
                        row.getDimensionValues(0).getValue(),
                        Long.parseLong(row.getMetricValues(0).getValue())));
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Funnel Analysis (likely unregistered dimension): {}", e.getMessage());
        }

        // 2. Engine Quality Metrics (Independent Try-Catch)
        try {
            RunReportRequest qRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addMetrics(Metric.newBuilder().setName("customEvent:stability_score"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:brick_count"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:lmm_latency"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName") // Only successful generations
                                    .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_success"))
                                    .build())
                            .build())
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse qResp = analyticsDataClient.runReport(qRequest);

            if (qResp.getRowsCount() > 0) {
                Row row = qResp.getRows(0);
                quality = new ProductIntelligenceResponse.EngineQuality(
                        Double.parseDouble(row.getMetricValues(0).getValue()),
                        Double.parseDouble(row.getMetricValues(1).getValue()),
                        Double.parseDouble(row.getMetricValues(2).getValue()),
                        Double.parseDouble(row.getMetricValues(3).getValue()));
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Engine Quality (likely unregistered metric): {}", e.getMessage());
        }

        // 3. Exit Point Analysis (Independent Try-Catch)
        try {
            RunReportResponse exitResp = analyticsDataClient.runReport(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:exit_step"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(10).build());

            for (Row row : exitResp.getRowsList()) {
                String step = row.getDimensionValues(0).getValue();
                if (!step.isEmpty() && !step.equals("(not set)")) {
                    exits.add(new ProductIntelligenceResponse.ExitPoint(step,
                            Long.parseLong(row.getMetricValues(0).getValue())));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Exit Points (likely unregistered dimension): {}", e.getMessage());
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

        List<DeepInsightResponse.CategoryStat> categoryStats = new ArrayList<>();
        List<DeepInsightResponse.KeywordStat> keywordStats = new ArrayList<>();
        // QualityStat is placeholder for now as correlation is complex
        List<DeepInsightResponse.QualityStat> qualityStats = new ArrayList<>();

        try { // Added try block
              // 1. Category Success Rate (Independent Try-Catch)
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
                Map<String, long[]> catMap = new HashMap<>(); // [success, fail]

                for (Row row : catResp.getRowsList()) {
                    String category = row.getDimensionValues(0).getValue();
                    String eventName = row.getDimensionValues(1).getValue();
                    long count = Long.parseLong(row.getMetricValues(0).getValue());

                    catMap.putIfAbsent(category, new long[] { 0, 0 });
                    if (eventName.equals("generate_success")) {
                        catMap.get(category)[0] += count; // index 0: success
                    } else {
                        catMap.get(category)[1] += count; // index 1: fail
                    }
                }

                catMap.forEach((k, v) -> {
                    if (!k.isEmpty() && !k.equals("(not set)")) {
                        categoryStats.add(new DeepInsightResponse.CategoryStat(k, v[0], v[1]));
                    }
                });
            } catch (Exception e) {
                log.warn("Failed to fetch Category Stats (likely unregistered dimension): {}", e.getMessage());
            }

            // 2. Search Keywords (Independent Try-Catch)
            try {
                RunReportRequest searchRequest = RunReportRequest.newBuilder()
                        .setProperty("properties/" + propertyId)
                        .addDimensions(Dimension.newBuilder().setName("customEvent:search_term"))
                        .addMetrics(Metric.newBuilder().setName("eventCount"))
                        .setDimensionFilter(FilterExpression.newBuilder()
                                .setFilter(Filter.newBuilder()
                                        .setFieldName("eventName")
                                        .setStringFilter(Filter.StringFilter.newBuilder().setValue("user_search"))
                                        .build())
                                .build())
                        .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                        .setLimit(20)
                        .build();

                RunReportResponse searchResp = analyticsDataClient.runReport(searchRequest);
                for (Row row : searchResp.getRowsList()) {
                    String keyword = row.getDimensionValues(0).getValue();
                    if (!keyword.isEmpty() && !keyword.equals("(not set)")) {
                        keywordStats.add(new DeepInsightResponse.KeywordStat(
                                keyword,
                                Long.parseLong(row.getMetricValues(0).getValue())));
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch Search Keywords (likely unregistered dimension): {}", e.getMessage());
            }
        } catch (Exception e) { // Corrected general catch block
            log.error("Failed to fetch Deep Insights (General): {}", e.getMessage());
        }

        return new DeepInsightResponse(categoryStats, qualityStats, keywordStats);
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

        List<FailureStat> failureStats = new ArrayList<>();
        PerformanceStat performance = new PerformanceResponse.PerformanceStat(0, 0, 0, 0);

        try {
            // 1. Failure Analysis (By error_type)
            RunReportRequest failRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:error_type"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName")
                                    .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_fail"))
                                    .build())
                            .build())
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse failResp = analyticsDataClient.runReport(failRequest);
            for (Row row : failResp.getRowsList()) {
                String reason = row.getDimensionValues(0).getValue();
                if (!reason.isEmpty() && !reason.equals("(not set)")) {
                    failureStats.add(new PerformanceResponse.FailureStat(
                            reason,
                            Long.parseLong(row.getMetricValues(0).getValue())));
                }
            }

            // 2. Performance Metrics (Avg Wait Time, Cost, Brick Count)
            RunReportRequest perfRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addMetrics(Metric.newBuilder().setName("customEvent:wait_time"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:brick_count"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:token_count")) // [New]
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(FilterExpression.newBuilder()
                            .setFilter(Filter.newBuilder()
                                    .setFieldName("eventName")
                                    .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_success"))
                                    .build())
                            .build())
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse perfResp = analyticsDataClient.runReport(perfRequest);
            if (!perfResp.getRowsList().isEmpty()) {
                Row row = perfResp.getRowsList().get(0);
                double totalWait = Double.parseDouble(row.getMetricValues(0).getValue());
                double totalCost = Double.parseDouble(row.getMetricValues(1).getValue());
                double totalBricks = Double.parseDouble(row.getMetricValues(2).getValue());
                double totalTokens = Double.parseDouble(row.getMetricValues(3).getValue()); // [New]
                long count = Long.parseLong(row.getMetricValues(4).getValue()); // Index shifted

                if (count > 0) {
                    performance = new PerformanceResponse.PerformanceStat(
                            totalWait / count,
                            totalCost / count,
                            totalBricks / count,
                            totalTokens / count); // [New]
                }
            }

        } catch (Exception e) {
            // [Fallback] If token_count is not registered yet, try without it
            log.warn("Failed to fetch performance details with token_count. Retrying without it. Error: {}",
                    e.getMessage());
            try {
                RunReportRequest fallbackRequest = RunReportRequest.newBuilder()
                        .setProperty("properties/" + propertyId)
                        .addMetrics(Metric.newBuilder().setName("customEvent:wait_time"))
                        .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                        .addMetrics(Metric.newBuilder().setName("customEvent:brick_count"))
                        // token_count excluded
                        .addMetrics(Metric.newBuilder().setName("eventCount"))
                        .setDimensionFilter(FilterExpression.newBuilder()
                                .setFilter(Filter.newBuilder()
                                        .setFieldName("eventName")
                                        .setStringFilter(Filter.StringFilter.newBuilder().setValue("generate_success"))
                                        .build())
                                .build())
                        .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                        .build();

                RunReportResponse fallbackResp = analyticsDataClient.runReport(fallbackRequest);
                if (!fallbackResp.getRowsList().isEmpty()) {
                    Row row = fallbackResp.getRowsList().get(0);
                    double totalWait = Double.parseDouble(row.getMetricValues(0).getValue());
                    double totalCost = Double.parseDouble(row.getMetricValues(1).getValue());
                    double totalBricks = Double.parseDouble(row.getMetricValues(2).getValue());
                    // totalTokens is 0
                    long count = Long.parseLong(row.getMetricValues(3).getValue());

                    if (count > 0) {
                        performance = new PerformanceResponse.PerformanceStat(
                                totalWait / count,
                                totalCost / count,
                                totalBricks / count,
                                0); // tokenCount default 0
                    }
                }
            } catch (Exception ex) {
                log.error("Failed to fetch performance details (Retry failed): {}", ex.getMessage());
            }
        }

        return new PerformanceResponse(failureStats, performance);
    }

    /**
     * [DEBUG] GA4 데이터 수집 상태 확인용
     */
    public Map<String, Object> getDebugInfo(int days) {
        Map<String, Object> debugResult = new HashMap<>();

        if (analyticsDataClient == null) {
            debugResult.put("status", "ERROR");
            debugResult.put("message", "Analytics Client is null");
            return debugResult;
        }

        try {
            debugResult.put("status", "OK");
            debugResult.put("propertyId", propertyId);

            // 1. Check Custom Dimensions Availability
            String[] dimensions = { "customEvent:image_category", "customEvent:error_type", "customEvent:search_term",
                    "customEvent:suggested_tags" };

            for (String dim : dimensions) {
                try {
                    RunReportRequest req = RunReportRequest.newBuilder()
                            .setProperty("properties/" + propertyId)
                            .addDimensions(Dimension.newBuilder().setName(dim))
                            .addMetrics(Metric.newBuilder().setName("eventCount"))
                            .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                            .setLimit(5)
                            .build();

                    RunReportResponse resp = analyticsDataClient.runReport(req);
                    List<String> rows = new ArrayList<>();
                    for (Row row : resp.getRowsList()) {
                        rows.add(row.getDimensionValues(0).getValue() + ": " + row.getMetricValues(0).getValue());
                    }
                    debugResult.put(dim, rows.isEmpty() ? "NO_DATA (Empty Rows)" : rows);
                } catch (Exception e) {
                    debugResult.put(dim, "ERROR: " + e.getMessage());
                }
            }

            // 2. Check Custom Metrics Availability
            try {
                RunReportRequest metricReq = RunReportRequest.newBuilder()
                        .setProperty("properties/" + propertyId)
                        .addMetrics(Metric.newBuilder().setName("customEvent:lmm_latency"))
                        .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                        .addMetrics(Metric.newBuilder().setName("eventCount"))
                        .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                        .build();

                RunReportResponse metricResp = analyticsDataClient.runReport(metricReq);
                if (!metricResp.getRowsList().isEmpty()) {
                    Row row = metricResp.getRowsList().get(0);
                    debugResult.put("metrics_check", Map.of(
                            "lmm_latency_sum", row.getMetricValues(0).getValue(),
                            "est_cost_sum", row.getMetricValues(1).getValue(),
                            "total_events", row.getMetricValues(2).getValue()));
                } else {
                    debugResult.put("metrics_check", "NO_DATA");
                }
            } catch (Exception e) {
                debugResult.put("metrics_check", "ERROR: " + e.getMessage());
            }

        } catch (Exception e) {
            debugResult.put("error", e.getMessage());
        }

        return debugResult;
    }
}
