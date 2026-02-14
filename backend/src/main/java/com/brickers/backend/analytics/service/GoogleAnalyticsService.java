package com.brickers.backend.analytics.service;

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
import java.util.List;
import java.util.Map;

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
    public List<Map<String, Object>> getTopPages(int days, int limit) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        RunReportRequest request = RunReportRequest.newBuilder()
                .setProperty("properties/" + propertyId)
                .addDimensions(Dimension.newBuilder().setName("pagePath"))
                .addMetrics(Metric.newBuilder().setName("screenPageViews"))
                .addDateRanges(DateRange.newBuilder()
                        .setStartDate(days + "daysAgo")
                        .setEndDate("today"))
                .setLimit(limit)
                .build();

        RunReportResponse response = analyticsDataClient.runReport(request);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Row row : response.getRowsList()) {
            result.add(Map.of(
                    "pagePath", row.getDimensionValues(0).getValue(),
                    "pageViews", Long.parseLong(row.getMetricValues(0).getValue())));
        }
        return result;
    }

    /**
     * 최근 N일간의 일별 활성 사용자 수(DAU) 트렌드를 조회합니다.
     */
    public List<Map<String, Object>> getDailyActiveUsers(int days) throws IOException {
        return getDailyMetricTrend(days, "activeUsers");
    }

    /**
     * 최근 N일간의 일별 특정 이벤트 발생 횟수 트렌드를 조회합니다.
     */
    public List<Map<String, Object>> getDailyEventStats(int days, String eventName) throws IOException {
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

    private List<Map<String, Object>> getDailyMetricTrend(int days, String metricName) throws IOException {
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

    private List<Map<String, Object>> processTrendResponse(RunReportResponse response) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Row row : response.getRowsList()) {
            result.add(Map.of(
                    "date", row.getDimensionValues(0).getValue(),
                    "count", Long.parseLong(row.getMetricValues(0).getValue())));
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
                                    .setFieldName("customUser:nickname") // userId 대신 닉네임 사용
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
    public List<Map<String, Object>> getTopTags(int days, int limit) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        // GA4에서 커스텀 파라미터는 차원(Dimension)으로 등록되어 있어야 조회가 수월합니다.
        // 현재는 'customEvent:suggested_tags' 형식의 차원이 있다고 가정하거나,
        // 이벤트와 파라미터를 필터링하여 조회해야 합니다. 브릭커스 환경에 맞춰 'customEvent:suggested_tags' 사용.
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
                .setLimit(limit)
                .build();

        RunReportResponse response = analyticsDataClient.runReport(request);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Row row : response.getRowsList()) {
            result.add(Map.of(
                    "tag", row.getDimensionValues(0).getValue(),
                    "count", Long.parseLong(row.getMetricValues(0).getValue())));
        }
        return result;
    }

    /**
     * 활동량이 가장 많은 상위 사용자들을 조회합니다.
     */
    public List<Map<String, Object>> getHeavyUsers(int days, int limit) throws IOException {
        if (analyticsDataClient == null)
            return new ArrayList<>();

        try {
            RunReportRequest request = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customUser:nickname")) // GA4 User Property: nickname
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder()
                            .setStartDate(days + "daysAgo")
                            .setEndDate("today"))
                    .setLimit(limit)
                    .build();

            RunReportResponse response = analyticsDataClient.runReport(request);
            List<Map<String, Object>> result = new ArrayList<>();
            for (Row row : response.getRowsList()) {
                String uid = row.getDimensionValues(0).getValue();
                if (uid.isEmpty() || uid.equals("(not set)"))
                    continue;

                result.add(Map.of(
                        "userId", uid,
                        "eventCount", Long.parseLong(row.getMetricValues(0).getValue())));
            }
            return result;
        } catch (Exception e) {
            log.error("Failed to get heavy users: {}", e.getMessage());
            return new ArrayList<>();
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
     * - 429 Too Many Requests 에러 방지를 위해 요청을 그룹화하여 전송합니다.
     * - GA4 BatchRunReports는 한 번에 최대 5개의 리포트만 요청 가능하므로, 2번 나누어 실행합니다.
     */
    /**
     * AI Agent용 통합 리포트 데이터 조회 (Batch Request 사용)
     * - 429 Too Many Requests 에러 방지를 위해 요청을 그룹화하여 전송합니다.
     * - GA4 BatchRunReports는 한 번에 최대 5개의 리포트만 요청 가능하므로, 2번 나누어 실행합니다.
     */
    public Map<String, Object> getProposalFullReport(int days) {
        if (analyticsDataClient == null)
            return Map.of();

        Map<String, Object> finalResult = new java.util.HashMap<>();

        try {
            // ---------------------------------------------------------
            // Batch 1: 핵심 지표 (Summary, Trends, Top Pages) - 4 Requests
            // ---------------------------------------------------------
            List<RunReportRequest> requests1 = new ArrayList<>();

            // 1. Summary (Active Users, Page Views, Sessions)
            requests1.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addMetrics(Metric.newBuilder().setName("activeUsers"))
                    .addMetrics(Metric.newBuilder().setName("screenPageViews"))
                    .addMetrics(Metric.newBuilder().setName("sessions"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build());

            // 2. Daily Users Trend
            requests1.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("date"))
                    .addMetrics(Metric.newBuilder().setName("activeUsers"))
                    .addDateRanges(DateRange.newBuilder().setStartDate((days * 2) + "daysAgo").setEndDate("today"))
                    .build());

            // 3. Top Pages (Overview)
            requests1.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("pagePath"))
                    .addMetrics(Metric.newBuilder().setName("screenPageViews"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(10)
                    .build());

            // 4. Top Tags (Custom Event)
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
                    .setLimit(10)
                    .build());

            // Execute Batch 1
            BatchRunReportsRequest batchRequest1 = BatchRunReportsRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addAllRequests(requests1)
                    .build();

            BatchRunReportsResponse batchResponse1 = analyticsDataClient.batchRunReports(batchRequest1);

            // Parse Batch 1
            if (batchResponse1.getReportsCount() >= 4) {
                // 1. Summary
                RunReportResponse r1 = batchResponse1.getReports(0);
                if (r1.getRowsCount() > 0) {
                    Row row = r1.getRows(0);
                    finalResult.put("summary", Map.of(
                            "activeUsers", Long.parseLong(row.getMetricValues(0).getValue()),
                            "pageViews", Long.parseLong(row.getMetricValues(1).getValue()),
                            "sessions", Long.parseLong(row.getMetricValues(2).getValue())));
                } else {
                    finalResult.put("summary", Map.of("activeUsers", 0, "pageViews", 0, "sessions", 0));
                }

                // 2. Daily Users
                finalResult.put("dailyUsers", processTrendResponse(batchResponse1.getReports(1)));

                // 3. Top Pages
                List<Map<String, Object>> topPages = new ArrayList<>();
                for (Row row : batchResponse1.getReports(2).getRowsList()) {
                    topPages.add(Map.of(
                            "pagePath", row.getDimensionValues(0).getValue(),
                            "pageViews", Long.parseLong(row.getMetricValues(0).getValue())));
                }
                finalResult.put("topPages", topPages);

                // 4. Top Tags
                List<Map<String, Object>> tags = new ArrayList<>();
                for (Row row : batchResponse1.getReports(3).getRowsList()) {
                    tags.add(Map.of(
                            "tag", row.getDimensionValues(0).getValue(),
                            "count", Long.parseLong(row.getMetricValues(0).getValue())));
                }
                finalResult.put("topTags", tags);
            }

            // ---------------------------------------------------------
            // Batch 2: Heavy Users & Event Stats - 4 Requests (Optimized)
            // ---------------------------------------------------------
            List<RunReportRequest> requests2 = new ArrayList<>();

            // 1. Heavy Users
            requests2.add(RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customUser:nickname"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(5)
                    .build());

            // 2. Event: generate_fail (7d)
            requests2.add(buildEventRequest("generate_fail", days));
            // 3. Event: generate_success (7d)
            requests2.add(buildEventRequest("generate_success", days));
            // 4. Event: gallery_register_attempt (1d) (Using 1d explicitly for safety)
            requests2.add(buildEventRequest("gallery_register_attempt", 1));

            // Execute Batch 2
            BatchRunReportsRequest batchRequest2 = BatchRunReportsRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addAllRequests(requests2)
                    .build();

            BatchRunReportsResponse batchResponse2 = analyticsDataClient.batchRunReports(batchRequest2);

            // Parse Batch 2
            if (batchResponse2.getReportsCount() >= 4) {
                // 1. Heavy Users
                List<Map<String, Object>> heavyUsers = new ArrayList<>();
                for (Row row : batchResponse2.getReports(0).getRowsList()) {
                    String uid = row.getDimensionValues(0).getValue();
                    if (!uid.isEmpty() && !uid.equals("(not set)")) {
                        heavyUsers.add(
                                Map.of("userId", uid, "eventCount", Long.parseLong(row.getMetricValues(0).getValue())));
                    }
                }
                finalResult.put("heavyUsers", heavyUsers);

                // 2-3. Event Stats (7d)
                List<Map<String, Object>> fail7d = processTrendResponse(batchResponse2.getReports(1));
                List<Map<String, Object>> success7d = processTrendResponse(batchResponse2.getReports(2));

                // Derive 1d stats (last element if exists - assuming sorted by date)
                List<Map<String, Object>> fail1d = fail7d.isEmpty() ? new ArrayList<>()
                        : List.of(fail7d.get(fail7d.size() - 1));
                List<Map<String, Object>> success1d = success7d.isEmpty() ? new ArrayList<>()
                        : List.of(success7d.get(success7d.size() - 1));

                // 4. Gallery 1d
                List<Map<String, Object>> gallery1d = processTrendResponse(batchResponse2.getReports(3));

                Map<String, Object> eventStats = new java.util.HashMap<>();
                eventStats.put("fail_7d", fail7d);
                eventStats.put("success_7d", success7d);
                eventStats.put("fail_1d", fail1d);
                eventStats.put("success_1d", success1d);
                eventStats.put("gallery_attempt_1d", gallery1d);

                finalResult.put("eventStats", eventStats);
            }

        } catch (Exception e) {
            log.error("Failed to get full proposal report: {}", e.getMessage());
            // Return partial result if possible or empty
        }

        return finalResult;
    }

    /**
     * [NEW] 제품 인텔리전스 전용 데이터 조회
     * 맞춤 정의된 차원과 측정항목을 사용하여 서비스의 독보적인 수치들을 가져옵니다.
     */
    public Map<String, Object> getProductIntelligence(int days) {
        if (analyticsDataClient == null)
            return Map.of();

        Map<String, Object> result = new java.util.HashMap<>();
        try {
            // 1. 퍼널 분석 (Funnel Stage Distribution)
            RunReportRequest funnelRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:funnel_stage"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            List<Map<String, Object>> funnelData = new ArrayList<>();
            for (Row row : analyticsDataClient.runReport(funnelRequest).getRowsList()) {
                funnelData.add(Map.of(
                        "stage", row.getDimensionValues(0).getValue(),
                        "count", Long.parseLong(row.getMetricValues(0).getValue())));
            }
            result.put("funnel", funnelData);

            // 2. 엔진 품질 지표 (Average Stability, Brick Count, LMM Latency)
            RunReportRequest qualityRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addMetrics(Metric.newBuilder().setName("customEvent:stability_score"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:brick_count"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:lmm_latency"))
                    .addMetrics(Metric.newBuilder().setName("customEvent:est_cost"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .build();

            RunReportResponse qualityResp = analyticsDataClient.runReport(qualityRequest);
            if (qualityResp.getRowsCount() > 0) {
                Row row = qualityResp.getRows(0);
                result.put("quality", Map.of(
                        "avgStability", Double.parseDouble(row.getMetricValues(0).getValue()),
                        "avgBrickCount", Double.parseDouble(row.getMetricValues(1).getValue()),
                        "avgLatency", Double.parseDouble(row.getMetricValues(2).getValue()),
                        "totalCost", Double.parseDouble(row.getMetricValues(3).getValue())));
            }

            // 3. 이탈 지점 분석 (UX Exit Points)
            RunReportRequest exitRequest = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:exit_step"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .addDateRanges(DateRange.newBuilder().setStartDate(days + "daysAgo").setEndDate("today"))
                    .setLimit(10)
                    .build();

            List<Map<String, Object>> exitData = new ArrayList<>();
            for (Row row : analyticsDataClient.runReport(exitRequest).getRowsList()) {
                String step = row.getDimensionValues(0).getValue();
                if (!step.isEmpty() && !step.equals("(not set)")) {
                    exitData.add(Map.of("step", step, "count", Long.parseLong(row.getMetricValues(0).getValue())));
                }
            }
            result.put("exits", exitData);

        } catch (Exception e) {
            log.error("Failed to get product intelligence: {}", e.getMessage());
        }
        return result;
    }
}
