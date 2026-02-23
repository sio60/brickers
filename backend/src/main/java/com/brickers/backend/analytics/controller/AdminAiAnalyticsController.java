package com.brickers.backend.analytics.controller;

import com.brickers.backend.analytics.dto.AnalyticsQueryRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/admin/analytics/ai")
public class AdminAiAnalyticsController {

    private final WebClient aiWebClient;

    @Value("${INTERNAL_API_TOKEN:}")
    private String internalApiToken;

    private boolean isInternalAuthorized(String token) {
        return internalApiToken != null && !internalApiToken.isBlank() && internalApiToken.equals(token);
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated())
            return false;
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private boolean isAdminOrInternal(String token) {
        return isInternalAuthorized(token) || isAdmin();
    }

    /**
     * [GET] 파이썬 AI 서버 쪽에 '이번 주(혹은 한 달) 요약 리포트를 작성해줘'라고 명령을 내리고 그 결과를 받아옵니다.
     */
    @GetMapping("/ai-report")
    public ResponseEntity<?> getAiReport(
            @RequestParam(name = "days", defaultValue = "7") int days) {
        if (!isAdminOrInternal(null))
            return ResponseEntity.status(403).build();
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
     * [POST] 현재 서비스에 쌓인 데이터를 기반으로 파이썬 AI 서버(LangGraph)에게 '심층 원인 분석'을 강제로 트리거(수동
     * 실행)합니다.
     */
    @PostMapping("/deep-analyze")
    public ResponseEntity<?> deepAnalyze() {
        if (!isAdminOrInternal(null))
            return ResponseEntity.status(403).build();
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
     * [POST] 관리자가 '요즘 10대들이 어떤 로그인 방식을 선호해?'와 같은 자연어 질문(query)을 던지면 AI가 분석해주는 대화형
     * 인터페이스입니다.
     */
    @PostMapping("/query")
    public ResponseEntity<?> queryAnalytics(@RequestBody AnalyticsQueryRequest request) {
        if (!isAdminOrInternal(null))
            return ResponseEntity.status(403).build();
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
}
