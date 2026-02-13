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
}
