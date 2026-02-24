package com.brickers.backend.analytics.service;

import com.brickers.backend.analytics.dto.HeavyUserResponse;
import com.google.analytics.data.v1beta.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

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

    public List<HeavyUserResponse> getHeavyUsers(int days, int limit) throws IOException {
        List<HeavyUserResponse> byNickname = fetchHeavyUsersWithDimension("customEvent:nickname", days, limit);
        if (!byNickname.isEmpty())
            return byNickname;
        return fetchHeavyUsersWithDimension("customEvent:user_id", days, limit);
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
