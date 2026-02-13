package com.brickers.backend.admin.moderation;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/moderation")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AdminModerationController {

    private final AdminModerationService moderationService;

    @Value("${INTERNAL_API_TOKEN:}")
    private String internalApiToken;

    private boolean isInternalAuthorized(String token) {
        return internalApiToken != null && !internalApiToken.isBlank() && internalApiToken.equals(token);
    }

    /**
     * AI Agent 전용 엔드포인트: 최근 미검열 콘텐츠 조회
     */
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentContents(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestParam(name = "days", defaultValue = "1") int days,
            @RequestParam(name = "limit", defaultValue = "50") int limit) {

        log.info("🔍 [AdminModeration] Recent Content Request (days={}, limit={})", days, limit);

        if (!isInternalAuthorized(token)) {
            log.warn("🚨 [AdminModeration] Unauthorized Access Attempt - Token Mismatch");
            return ResponseEntity.status(401).body("Unauthorized internal access");
        }

        return ResponseEntity.ok(moderationService.getRecentContents(days, limit));
    }

    /**
     * AI Agent 전용 엔드포인트: 유해 콘텐츠 숨김 처리
     */
    @PostMapping("/hide")
    public ResponseEntity<?> hideContent(
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestBody Map<String, String> request) {

        if (!isInternalAuthorized(token)) {
            log.warn("🚨 [AdminModeration] Unauthorized Hide Attempt");
            return ResponseEntity.status(401).body("Unauthorized internal access");
        }

        String type = request.get("type");
        String targetId = request.get("targetId");
        String reason = request.get("reason");

        log.info("🛡️ [AdminModeration] Hiding Content: Type={}, ID={}, Reason={}", type, targetId, reason);

        moderationService.hideContent(type, targetId, reason);
        return ResponseEntity.ok(Map.of("status", "success", "action", "HIDDEN"));
    }
}
