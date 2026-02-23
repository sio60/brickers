package com.brickers.backend.analytics.service;

import com.brickers.backend.analytics.dto.DailyTrendResponse;
import com.google.analytics.data.v1beta.Metric;
import com.google.analytics.data.v1beta.Row;
import com.google.analytics.data.v1beta.RunReportRequest;
import com.google.analytics.data.v1beta.RunReportResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * 📈 GaTrafficService
 * 
 * 활성 사용자 수, 페이지뷰, 세션 등 순수 방문량 및 트래픽 지표를 담당합니다.
 */
@Slf4j
@Service
public class GaTrafficService extends GaBaseService {

    public GaTrafficService(GaClientProvider clientProvider) {
        super(clientProvider);
    }

    public long getActiveUsers(int days) throws IOException {
        return getMetricSum(days, "activeUsers");
    }

    public long getPageViews(int days) throws IOException {
        return getMetricSum(days, "screenPageViews");
    }

    public long getSessions(int days) throws IOException {
        return getMetricSum(days, "sessions");
    }

    public List<DailyTrendResponse> getDailyActiveUsers(int days) throws IOException {
        return getDailyMetricTrend(days, "activeUsers");
    }

    public List<DailyTrendResponse> getDailyMetricTrend(int days, String metricName) throws IOException {
        if (getClient() == null)
            return new ArrayList<>();

        RunReportRequest request = buildBasicRequest(days)
                .addDimensions(com.google.analytics.data.v1beta.Dimension.newBuilder().setName("date"))
                .addMetrics(Metric.newBuilder().setName(metricName))
                .build();

        return processTrendResponse(getClient().runReport(request));
    }

    public List<DailyTrendResponse> processTrendResponse(RunReportResponse response) {
        List<DailyTrendResponse> result = new ArrayList<>();
        for (Row row : response.getRowsList()) {
            result.add(new DailyTrendResponse(
                    row.getDimensionValues(0).getValue(),
                    Long.parseLong(row.getMetricValues(0).getValue())));
        }
        return result;
    }

    private long getMetricSum(int days, String metricName) throws IOException {
        if (getClient() == null)
            return 0;

        RunReportRequest request = buildBasicRequest(days)
                .addMetrics(Metric.newBuilder().setName(metricName))
                .build();

        RunReportResponse response = getClient().runReport(request);
        if (response.getRowsCount() > 0) {
            return Long.parseLong(response.getRows(0).getMetricValues(0).getValue());
        }
        return 0;
    }

    public List<DailyTrendResponse> getDailyEventStats(int days, String eventName) throws IOException {
        if (getClient() == null)
            return new ArrayList<>();

        RunReportRequest request = buildBasicRequest(days)
                .addDimensions(com.google.analytics.data.v1beta.Dimension.newBuilder().setName("date"))
                .addMetrics(Metric.newBuilder().setName("eventCount"))
                .setDimensionFilter(createDimensionFilter("eventName", eventName, false))
                .build();

        return processTrendResponse(getClient().runReport(request));
    }
}
