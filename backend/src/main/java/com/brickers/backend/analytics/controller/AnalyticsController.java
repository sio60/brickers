package com.brickers.backend.analytics.controller;

import com.brickers.backend.analytics.service.GoogleAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AnalyticsController {

    private final GoogleAnalyticsService gaService;
    private final org.springframework.web.reactive.function.client.WebClient aiWebClient;

    @org.springframework.beans.factory.annotation.Value("${INTERNAL_API_TOKEN:}")
    private String internalApiToken;

    private boolean isInternalAuthorized(String token) {
        return internalApiToken != null && !internalApiToken.isBlank() && internalApiToken.equals(token);
    }

    @GetMapping("/active-users")
    public ResponseEntity<?> getActiveUsers(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days) throws IOException {
        if (!isInternalAuthorized(token)) {
            // Internal token이 없으면 기존 시큐리티 권한(ADMIN)에 의존하거나 권한 없음 처리
            // 여기서는 내부 통신 전용으로 설계하기 위해 토큰 필수 체크
            return ResponseEntity.status(403).body("Unauthorized internal access");
        }
        long count = gaService.getActiveUsers(days);
        return ResponseEntity.ok(Map.of("activeUsers", count));
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days) throws IOException {
        if (!isInternalAuthorized(token)) {
            return ResponseEntity.status(403).body("Unauthorized internal access");
        }
        return ResponseEntity.ok(Map.of(
                "activeUsers", gaService.getActiveUsers(days),
                "pageViews", gaService.getPageViews(days),
                "sessions", gaService.getSessions(days)));
    }

    @GetMapping("/top-pages")
    public ResponseEntity<?> getTopPages(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) throws IOException {
        if (!isInternalAuthorized(token)) {
            return ResponseEntity.status(403).body("Unauthorized internal access");
        }
        return ResponseEntity.ok(gaService.getTopPages(days, limit));
    }

    @GetMapping("/daily-users")
    public ResponseEntity<?> getDailyUsers(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days) throws IOException {
        if (!isInternalAuthorized(token)) {
            return ResponseEntity.status(403).body("Unauthorized internal access");
        }
        return ResponseEntity.ok(gaService.getDailyActiveUsers(days));
    }

    @GetMapping("/event-stats")
    public ResponseEntity<?> getEventStats(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "event") String eventName,
            @RequestParam(name = "days", defaultValue = "7") int days) throws IOException {
        if (!isInternalAuthorized(token)) {
            return ResponseEntity.status(403).body("Unauthorized internal access");
        }
        return ResponseEntity.ok(gaService.getDailyEventStats(days, eventName));
    }

    @GetMapping("/user-activity")
    public ResponseEntity<?> getUserActivity(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "userId") String userId,
            @RequestParam(name = "days", defaultValue = "30") int days) throws IOException {
        if (!isInternalAuthorized(token)) {
            return ResponseEntity.status(403).body("Unauthorized internal access");
        }
        return ResponseEntity.ok(gaService.getUserActivity(userId, days));
    }

    @GetMapping("/top-tags")
    public ResponseEntity<?> getTopTags(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) throws IOException {
        if (!isInternalAuthorized(token)) {
            return ResponseEntity.status(403).body("Unauthorized internal access");
        }
        return ResponseEntity.ok(gaService.getTopTags(days, limit));
    }

    @GetMapping("/heavy-users")
    public ResponseEntity<?> getHeavyUsers(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) throws IOException {
        if (!isInternalAuthorized(token)) {
            return ResponseEntity.status(403).body("Unauthorized internal access");
        }
        return ResponseEntity.ok(gaService.getHeavyUsers(days, limit));
    }

    /**
     * AI 서버의 분석 리포트를 중계합니다.
     * 프론트엔드 -> 자바 백엔드 -> AI 서버
     */
    @GetMapping("/ai-report")
    public ResponseEntity<?> getAiReport(
            @RequestParam(name = "days", defaultValue = "7") int days) {
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
     * 프론트엔드 -> 자바 백엔드 -> AI 서버 (POST)
     * AI 서버에서 데이터 수집 → 이상 탐지 → 인과 추론 → 전략 수립 파이프라인을 실행합니다.
     */
    @PostMapping("/deep-analyze")
    public ResponseEntity<?> deepAnalyze() {
        log.info("[AnalyticsBridge] 🧠 Requesting LangGraph Deep Analysis...");
        try {
            return aiWebClient.post()
                    .uri("/ai-admin/analytics/deep-analyze")
                    .retrieve()
                    .toEntity(Object.class)
                    .timeout(java.time.Duration.ofSeconds(60))
                    .block();
        } catch (Exception e) {
            log.error("[AnalyticsBridge] Deep Analysis failed: {}", e.getMessage());
            return ResponseEntity.status(502)
                    .body(Map.of("error", "AI Deep Analysis failed", "details", e.getMessage()));
        }
    }
}
