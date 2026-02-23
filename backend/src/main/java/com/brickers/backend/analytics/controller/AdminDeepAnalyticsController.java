package com.brickers.backend.analytics.controller;

import com.brickers.backend.analytics.dto.*;
import com.brickers.backend.analytics.service.GoogleAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/admin/analytics/deep")
public class AdminDeepAnalyticsController {

    private final GoogleAnalyticsService gaService;

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
     * [GET] 사용자의 가입/탐색 퍼널(Funnel) 이탈률 분석과 함께 AI 엔진의 퀄리티(비용, 지연시간, 안정성) 등 핵심 비즈니스
     * KPI를 반환합니다.
     */
    @GetMapping("/product-intelligence")
    public ResponseEntity<ProductIntelligenceResponse> getProductIntelligence(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days) {
        if (!isAdminOrInternal(token))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(gaService.getProductIntelligence(days));
    }

    /**
     * [GET] 생성한 '이미지 카테고리'별로 얼마나 성공/실패했는지, 주요 사용자 연령대는 어떻게 분포하는지 등 다각도 통계를 반환합니다.
     */
    @GetMapping("/deep-insights")
    public ResponseEntity<DeepInsightResponse> getDeepInsights(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days) {
        if (!isAdminOrInternal(token))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(gaService.getDeepInsights(days));
    }

    /**
     * [GET] 일간 '브릭 생성 성공' 건수가 어떻게 변화하고 있는지 우상향 꺾은선 차트를 그리기 위한 데이터를 반환합니다.
     */
    @GetMapping("/generation-trend")
    public ResponseEntity<List<DailyTrendResponse>> getGenerationTrend(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "7") int days) {
        if (!isAdminOrInternal(token))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(gaService.getGenerationTrend(days));
    }

    /**
     * [GET] 사용자들이 가장 많이 겪은 시스템 오류 원인(Failure Reason)과 건당 지출 비용, 건당 사용 토큰수 등 기술적 상세
     * 지표를 조회합니다.
     */
    @GetMapping("/performance")
    public ResponseEntity<PerformanceResponse> getPerformanceDetails(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days) {
        if (!isAdminOrInternal(token))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(gaService.getPerformanceDetails(days));
    }

    /**
     * [GET] 개발자/관리자 전용. GA4 API 연동이 정상적인지, 비용 로그가 수집되고 있는지 raw 데이터 차원에서 검증해주는
     * 엔드포인트입니다.
     */
    @GetMapping("/diagnostic")
    public ResponseEntity<?> getDiagnostic(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(defaultValue = "30") int days) {
        if (!isAdminOrInternal(token))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(gaService.getDiagnosticInfo(days));
    }
}
