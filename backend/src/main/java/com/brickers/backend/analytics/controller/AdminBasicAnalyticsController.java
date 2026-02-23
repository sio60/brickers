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

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/admin/analytics/basic")
public class AdminBasicAnalyticsController {

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
     * [GET] 브리커스 앱 내에서 가장 이벤트를 폭발적으로 많이 발생시킨 '충성 고객(Heavy User)' 랭킹을 반환합니다.
     */
    @GetMapping("/heavy-users")
    public ResponseEntity<List<HeavyUserResponse>> getHeavyUsers(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) throws IOException {
        if (!isAdminOrInternal(token))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(gaService.getHeavyUsers(days, limit));
    }

    /**
     * [GET] 프론트엔드 대시보드 로딩 최적화용. 요약 정보, 트렌드, 인기 태그를 한 번에 묶어서 반환합니다.
     */
    @GetMapping("/summary-package")
    public ResponseEntity<Map<String, Object>> getSummaryPackage(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days) {
        if (!isAdminOrInternal(token))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(gaService.getSummaryPackage(days));
    }
}
