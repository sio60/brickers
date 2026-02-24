package com.brickers.backend.analytics.service;

import com.brickers.backend.analytics.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@Service
public class GoogleAnalyticsService {

    private final GaActivityService activityService;
    private final GaEngineAnalyticsService engineAnalyticsService;
    private final GaDemographicService demographicService;
    private final GaBatchService batchService;

    public List<HeavyUserResponse> getHeavyUsers(int days, int limit) throws IOException {
        return activityService.getHeavyUsers(days, limit);
    }

    public ProductIntelligenceResponse getProductIntelligence(int days) {
        return engineAnalyticsService.getProductIntelligence(days);
    }

    public DeepInsightResponse getDeepInsights(int days) {
        return demographicService.getDeepInsights(days);
    }

    public List<DailyTrendResponse> getGenerationTrend(int days) {
        return demographicService.getGenerationTrend(days);
    }

    public PerformanceResponse getPerformanceDetails(int days) {
        return engineAnalyticsService.getPerformanceDetails(days);
    }

    public Map<String, Object> getSummaryPackage(int days) {
        return batchService.getSummaryPackage(days);
    }
}
