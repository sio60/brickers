package com.brickers.backend.analytics.service;

import com.brickers.backend.analytics.dto.DailyTrendResponse;
import com.google.analytics.data.v1beta.Row;
import com.google.analytics.data.v1beta.RunReportResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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

    public List<DailyTrendResponse> processTrendResponse(RunReportResponse response) {
        List<DailyTrendResponse> result = new ArrayList<>();
        for (Row row : response.getRowsList()) {
            result.add(new DailyTrendResponse(
                    row.getDimensionValues(0).getValue(),
                    Long.parseLong(row.getMetricValues(0).getValue())));
        }
        return result;
    }
}
