package com.brickers.backend.analytics.service;

import com.brickers.backend.analytics.dto.HeavyUserResponse;
import com.brickers.backend.analytics.dto.TopPageResponse;
import com.brickers.backend.analytics.dto.TopTagResponse;
import com.google.analytics.data.v1beta.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * 🏃 GaActivityService
 * 
 * 인기 페이지, 태그, 헤비 유저 등 사용자의 구체적인 활동 데이터를 담당합니다.
 */
@Slf4j
@Service
public class GaActivityService extends GaBaseService {

    public GaActivityService(GaClientProvider clientProvider) {
        super(clientProvider);
    }

    public List<TopPageResponse> getTopPages(int days, int limit) throws IOException {
        if (getClient() == null)
            return new ArrayList<>();

        RunReportRequest request = buildBasicRequest(days)
                .addDimensions(Dimension.newBuilder().setName("pagePath"))
                .addMetrics(Metric.newBuilder().setName("screenPageViews"))
                .addMetrics(Metric.newBuilder().setName("userEngagementDuration"))
                .setLimit(limit)
                .build();

        RunReportResponse response = getClient().runReport(request);
        List<TopPageResponse> result = new ArrayList<>();

        for (Row row : response.getRowsList()) {
            long views = Long.parseLong(row.getMetricValues(0).getValue());
            double totalDuration = Double.parseDouble(row.getMetricValues(1).getValue());
            double avgDuration = views > 0 ? totalDuration / views : 0;
            result.add(new TopPageResponse(row.getDimensionValues(0).getValue(), views, avgDuration));
        }
        return result;
    }

    public List<TopTagResponse> getTopTags(int days, int limit) throws IOException {
        if (getClient() == null)
            return new ArrayList<>();

        RunReportRequest request = buildBasicRequest(days)
                .addDimensions(Dimension.newBuilder().setName("customEvent:suggested_tags"))
                .addMetrics(Metric.newBuilder().setName("eventCount"))
                .setDimensionFilter(createDimensionFilter("eventName", "generate_success", false))
                .setLimit(limit * 2) // 필터링을 위해 넉넉히 가져옴
                .build();

        RunReportResponse response = getClient().runReport(request);
        List<TopTagResponse> result = new ArrayList<>();
        for (Row row : response.getRowsList()) {
            String tag = row.getDimensionValues(0).getValue();
            if (tag == null || tag.equals("(not set)") || tag.isEmpty())
                continue;
            result.add(new TopTagResponse(tag, Long.parseLong(row.getMetricValues(0).getValue())));
            if (result.size() >= limit)
                break;
        }
        return result;
    }

    public List<HeavyUserResponse> getHeavyUsers(int days, int limit) throws IOException {
        List<HeavyUserResponse> byNickname = fetchHeavyUsersWithDimension("customEvent:nickname", days, limit);
        if (!byNickname.isEmpty())
            return byNickname;
        return fetchHeavyUsersWithDimension("customEvent:user_id", days, limit);
    }

    public List<Map<String, Object>> getUserActivity(String userId, int days) throws IOException {
        if (getClient() == null)
            return new ArrayList<>();

        RunReportRequest request = buildBasicRequest(days)
                .addDimensions(Dimension.newBuilder().setName("eventName"))
                .addDimensions(Dimension.newBuilder().setName("dateHourMinute"))
                .addMetrics(Metric.newBuilder().setName("eventCount"))
                .setDimensionFilter(createDimensionFilter("customEvent:user_id", userId, false))
                .setLimit(100)
                .build();

        RunReportResponse response = getClient().runReport(request);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Row row : response.getRowsList()) {
            Map<String, Object> map = new HashMap<>();
            map.put("event", row.getDimensionValues(0).getValue());
            map.put("time", row.getDimensionValues(1).getValue());
            map.put("count", row.getMetricValues(0).getValue());
            result.add(map);
        }
        return result;
    }

    private List<HeavyUserResponse> fetchHeavyUsersWithDimension(String dimensionName, int days, int limit)
            throws IOException {
        if (getClient() == null)
            return new ArrayList<>();

        RunReportRequest request = buildBasicRequest(days)
                .addDimensions(Dimension.newBuilder().setName(dimensionName))
                .addMetrics(Metric.newBuilder().setName("eventCount"))
                .setLimit(limit)
                .build();

        RunReportResponse response = getClient().runReport(request);
        List<HeavyUserResponse> result = new ArrayList<>();
        for (Row row : response.getRowsList()) {
            String val = row.getDimensionValues(0).getValue();
            if (val == null || val.equals("(not set)") || val.isEmpty())
                continue;
            result.add(new HeavyUserResponse(val, Long.parseLong(row.getMetricValues(0).getValue())));
        }
        return result;
    }
}
