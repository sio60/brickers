package com.brickers.backend.analytics.controller;

import com.brickers.backend.analytics.dto.*;
import com.brickers.backend.analytics.service.GoogleAnalyticsService;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AnalyticsController {

    private final GoogleAnalyticsService gaService;
    private final WebClient aiWebClient;

    @Value("${INTERNAL_API_TOKEN:}")
    private String internalApiToken;

    private boolean isInternalAuthorized(String token) {
        return internalApiToken != null && !internalApiToken.isBlank() && internalApiToken.equals(token);
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated())
            return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private boolean isAdminOrInternal(String token) {
        return isInternalAuthorized(token) || isAdmin();
    }

    @GetMapping("/active-users")
    public ResponseEntity<?> getActiveUsers(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days) throws IOException {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).body("Unauthorized internal access");
        }
        long count = gaService.getActiveUsers(days);
        return ResponseEntity.ok(Map.of("activeUsers", count));
    }

    @GetMapping("/summary")
    public ResponseEntity<AnalyticsSummaryResponse> getSummary(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days) throws IOException {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(new AnalyticsSummaryResponse(
                gaService.getActiveUsers(days),
                gaService.getPageViews(days),
                gaService.getSessions(days)));
    }

    @GetMapping("/top-pages")
    public ResponseEntity<List<TopPageResponse>> getTopPages(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) throws IOException {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getTopPages(days, limit));
    }

    @GetMapping("/daily-users")
    public ResponseEntity<List<DailyTrendResponse>> getDailyUsers(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days) throws IOException {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getDailyActiveUsers(days));
    }

    @GetMapping("/event-stats")
    public ResponseEntity<List<DailyTrendResponse>> getEventStats(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "event") String eventName,
            @RequestParam(name = "days", defaultValue = "7") int days) throws IOException {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getDailyEventStats(days, eventName));
    }

    @GetMapping("/user-activity")
    public ResponseEntity<List<Map<String, Object>>> getUserActivity(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "days", defaultValue = "30") int days) throws IOException {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getUserActivity(userId, days));
    }

    @GetMapping("/top-tags")
    public ResponseEntity<List<TopTagResponse>> getTopTags(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) throws IOException {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getTopTags(days, limit));
    }

    @GetMapping("/heavy-users")
    public ResponseEntity<List<HeavyUserResponse>> getHeavyUsers(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) throws IOException {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getHeavyUsers(days, limit));
    }

    /**
     * AI Agent 요청 통합 엔드포인트 (429 에러 방지용)
     */
    @GetMapping("/full-report")
    public ResponseEntity<FullReportResponse> getFullReport(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days) {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getProposalFullReport(days));
    }

    /**
     * AI 서버의 분석 리포트를 중계합니다.
     */
    @GetMapping("/ai-report")
    public ResponseEntity<?> getAiReport(
            @RequestParam(name = "days", defaultValue = "7") int days) {
        if (!isAdminOrInternal(null)) {
            return ResponseEntity.status(403).build();
        }
        log.info("[AnalyticsBridge] Requesting AI analysis report for last {} days", days);
        try {
            return aiWebClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/ai-admin/analytics/ai-report")
                            .queryParam("days", days)
                            .build())
                    .retrieve()
                    .toEntity(Object.class)
                    .block();
        } catch (Exception e) {
            log.error("[AnalyticsBridge] AI Server connection failed: {}", e.getMessage());
            return ResponseEntity.status(502)
                    .body(Map.of("error", "AI Server connection failed", "details", e.getMessage()));
        }
    }

    /**
     * [NEW] LangGraph 기반 심층 분석을 중계합니다.
     */
    @PostMapping("/deep-analyze")
    public ResponseEntity<?> deepAnalyze() {
        if (!isAdminOrInternal(null)) {
            return ResponseEntity.status(403).build();
        }
        log.info("[AnalyticsBridge] 🧠 Requesting LangGraph Deep Analysis...");
        try {
            return aiWebClient.post()
                    .uri("/ai-admin/analytics/deep-analyze")
                    .retrieve()
                    .toEntity(Object.class)
                    .timeout(java.time.Duration.ofSeconds(120))
                    .block();
        } catch (Exception e) {
            log.error("[AnalyticsBridge] Deep Analysis failed: {}", e.getMessage());
            return ResponseEntity.status(502)
                    .body(Map.of("error", "AI Deep Analysis failed", "details", e.getMessage()));
        }
    }

    /**
     * [NEW] 인터랙티브 분석 쿼리를 중계합니다. (자연어 질문)
     */
    @PostMapping("/query")
    public ResponseEntity<?> queryAnalytics(@RequestBody AnalyticsQueryRequest request) {
        if (!isAdminOrInternal(null)) {
            return ResponseEntity.status(403).build();
        }
        log.info("[AnalyticsBridge] 💬 Processing custom analytics query...");
        try {
            return aiWebClient.post()
                    .uri("/ai-admin/analytics/query")
                    .bodyValue(request)
                    .retrieve()
                    .toEntity(Object.class)
                    .block();
        } catch (Exception e) {
            log.error("[AnalyticsBridge] Query Analysis failed: {}", e.getMessage());
            return ResponseEntity.status(502)
                    .body(Map.of("error", "AI Query Analysis failed", "details", e.getMessage()));
        }
    }

    /**
     * [NEW] 제품 인텔리전스 데이터 조회 (맞춤 지표)
     */
    @GetMapping("/product-intelligence")
    public ResponseEntity<ProductIntelligenceResponse> getProductIntelligence(
            @RequestParam(name = "days", defaultValue = "7") int days) {
        log.info("[AnalyticsBridge] Fetching Product Intelligence metrics for last {} days", days);
        return ResponseEntity.ok(gaService.getProductIntelligence(days));
    }

    /**
     * [NEW] 심층 분석 (Deep Insights) 차트용 데이터
     */
    @GetMapping("/deep-insights")
    public ResponseEntity<DeepInsightResponse> getDeepInsights(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days) {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getDeepInsights(days));
    }

    /**
     * [NEW] 일별 브릭 생성 활성화 추이
     */
    @GetMapping("/generation-trend")
    public ResponseEntity<List<DailyTrendResponse>> getGenerationTrend(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days) {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getGenerationTrend(days));
    }

    /**
     * [NEW] 상세 성능 지표 조회
     */
    @GetMapping("/performance")
    public ResponseEntity<PerformanceResponse> getPerformanceDetails(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days) {
        if (!isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getPerformanceDetails(days));
    }

}
