package com.brickers.backend.analytics.dto;

import java.util.List;
import java.util.Map;

public record FullReportResponse(
                AnalyticsSummaryResponse summary,
                List<DailyTrendResponse> dailyUsers,
                List<TopPageResponse> topPages,
                List<TopTagResponse> topTags,
                List<TopTagResponse> topKeywords, // [NEW] 실시간 검색 키워드
                List<HeavyUserResponse> heavyUsers,
                Map<String, List<DailyTrendResponse>> eventStats) {
}
