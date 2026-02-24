package com.brickers.backend.analytics.controller;

import com.brickers.backend.analytics.dto.*;
import com.brickers.backend.analytics.service.GoogleAnalyticsService;
import com.brickers.backend.auth.service.InternalAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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
    private final InternalAuthService authService;

    /**
     * [GET] 브리커스 앱 내에서 가장 이벤트를 폭발적으로 많이 발생시킨 '충성 고객(Heavy User)' 랭킹을 반환합니다.
     */
    @GetMapping("/heavy-users")
    public ResponseEntity<List<HeavyUserResponse>> getHeavyUsers(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) throws IOException {

        if (!authService.isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getHeavyUsers(days, limit));
    }

    /**
     * [GET] 프론트엔드 대시보드 로딩 최적화용. 요약 정보, 트렌드, 인기 태그를 한 번에 묶어서 반환합니다.
     */
    @GetMapping("/summary-package")
    public ResponseEntity<Map<String, Object>> getSummaryPackage(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "30") int days) {

        if (!authService.isAdminOrInternal(token)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gaService.getSummaryPackage(days));
    }
}
