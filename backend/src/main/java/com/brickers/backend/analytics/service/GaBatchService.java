package com.brickers.backend.analytics.service;

import com.brickers.backend.analytics.dto.AnalyticsSummaryResponse;
import com.brickers.backend.analytics.dto.DailyTrendResponse;
import com.brickers.backend.analytics.dto.TopTagResponse;
import com.google.analytics.data.v1beta.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 📦 GaBatchService
 * 
 * 대시보드 로딩 최적화를 위한 배치 요청 및 데이터 패키징을 담당합니다.
 */
@Slf4j
@Service
public class GaBatchService extends GaBaseService {

    public GaBatchService(GaClientProvider clientProvider) {
        super(clientProvider);
    }

    public Map<String, Object> getSummaryPackage(int days) {
        Map<String, Object> result = new HashMap<>();
        if (getClient() == null)
            return result;

        try {
            List<RunReportRequest> requests = new ArrayList<>();
            // 1. 요약 (활성 유저, 페이지뷰, 세션)
            requests.add(buildBasicRequest(days)
                    .addMetrics(Metric.newBuilder().setName("activeUsers"))
                    .addMetrics(Metric.newBuilder().setName("screenPageViews"))
                    .addMetrics(Metric.newBuilder().setName("sessions"))
                    .build());

            // 2. 트렌드
            requests.add(buildBasicRequest(days)
                    .addDimensions(Dimension.newBuilder().setName("date"))
                    .addMetrics(Metric.newBuilder().setName("activeUsers"))
                    .build());

            // 3. 인기 태그
            requests.add(buildBasicRequest(days)
                    .addDimensions(Dimension.newBuilder().setName("customEvent:suggested_tags"))
                    .addMetrics(Metric.newBuilder().setName("eventCount"))
                    .setDimensionFilter(createDimensionFilter("eventName", "generate_success", false))
                    .setLimit(50)
                    .build());

            BatchRunReportsResponse batchResp = getClient().batchRunReports(
                    BatchRunReportsRequest.newBuilder()
                            .setProperty(getProperty())
                            .addAllRequests(requests.stream()
                                    .map(r -> RunReportRequest.newBuilder(r).setProperty("").build())
                                    .collect(java.util.stream.Collectors.toList()))
                            .build());

            if (batchResp.getReportsCount() >= 3) {
                // 요약 파싱
                RunReportResponse r0 = batchResp.getReports(0);
                if (r0.getRowsCount() > 0) {
                    result.put("summary", new AnalyticsSummaryResponse(
                            Long.parseLong(r0.getRows(0).getMetricValues(0).getValue()),
                            Long.parseLong(r0.getRows(0).getMetricValues(1).getValue()),
                            Long.parseLong(r0.getRows(0).getMetricValues(2).getValue())));
                }

                // 트렌드 파싱
                List<DailyTrendResponse> dailyUsers = new ArrayList<>();
                for (Row row : batchResp.getReports(1).getRowsList()) {
                    dailyUsers.add(new DailyTrendResponse(row.getDimensionValues(0).getValue(),
                            Long.parseLong(row.getMetricValues(0).getValue())));
                }
                result.put("dailyUsers", dailyUsers);

                // 인기 태그 파싱
                Map<String, Long> tagCounts = new HashMap<>();
                for (Row row : batchResp.getReports(2).getRowsList()) {
                    String tags = row.getDimensionValues(0).getValue();
                    if (tags == null || tags.equals("(not set)"))
                        continue;
                    long count = Long.parseLong(row.getMetricValues(0).getValue());
                    for (String t : tags.split(",")) {
                        String clean = t.trim();
                        if (!clean.isEmpty())
                            tagCounts.put(clean, tagCounts.getOrDefault(clean, 0L) + count);
                    }
                }
                List<TopTagResponse> topTags = new ArrayList<>();
                tagCounts.entrySet().stream()
                        .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                        .limit(10)
                        .forEach(e -> topTags.add(new TopTagResponse(e.getKey(), e.getValue())));
                result.put("topTags", topTags);
            }
        } catch (Exception e) {
            log.error("Batch fetch failed: {}", e.getMessage());
        }
        return result;
    }
}
