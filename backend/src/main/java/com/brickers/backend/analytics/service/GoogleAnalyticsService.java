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

    private final GaTrafficService trafficService;
    private final GaActivityService activityService;
    private final GaEngineAnalyticsService engineAnalyticsService;
    private final GaDemographicService demographicService;
    private final GaBatchService batchService;

    public long getActiveUsers(int days) throws IOException {
        return trafficService.getActiveUsers(days);
    }

    public long getPageViews(int days) throws IOException {
        return trafficService.getPageViews(days);
    }

    public long getSessions(int days) throws IOException {
        return trafficService.getSessions(days);
    }

    public List<TopPageResponse> getTopPages(int days, int limit) throws IOException {
        return activityService.getTopPages(days, limit);
    }

    public List<DailyTrendResponse> getDailyActiveUsers(int days) throws IOException {
        return trafficService.getDailyActiveUsers(days);
    }

    public List<DailyTrendResponse> getDailyEventStats(int days, String eventName) throws IOException {
        return trafficService.getDailyEventStats(days, eventName);
    }

    public List<Map<String, Object>> getUserActivity(String userId, int days) throws IOException {
        return activityService.getUserActivity(userId, days);
    }

    public List<TopTagResponse> getTopTags(int days, int limit) throws IOException {
        return activityService.getTopTags(days, limit);
    }

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

    public Map<String, Object> getDiagnosticInfo(int days) {
        // 기존 GaIntelligenceService의 진단 로직 (단순화)
        return Map.of("status", "ok", "service", "GoogleAnalyticsDataV1Beta");
    }

    public Map<String, Object> getSummaryPackage(int days) {
        return batchService.getSummaryPackage(days);
    }
}
