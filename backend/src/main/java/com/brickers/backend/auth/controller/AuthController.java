package com.brickers.backend.auth.controller;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.entity.AuditLog;
import com.brickers.backend.audit.repository.AuditLogRepository;
import com.brickers.backend.audit.service.AuditLogService;
import com.brickers.backend.auth.dto.LoginHistoryResponse;
import com.brickers.backend.auth.dto.TokenStatusResponse;
import com.brickers.backend.auth.dto.UserMeResponse;
import com.brickers.backend.auth.jwt.JwtProvider;
import com.brickers.backend.auth.refresh.RefreshToken;
import com.brickers.backend.auth.refresh.RefreshTokenRepository;
import com.brickers.backend.auth.service.AuthTokenService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import com.brickers.backend.auth.repository.LoginHistoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthTokenService tokenService;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final LoginHistoryRepository loginHistoryRepository;
    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;

    /** ✅ refresh-cookie로 access 재발급 + refresh rotation */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request) {
        String refreshRaw = readCookie(request, "refreshToken");
        log.info("[Debug] Refresh cookie: {}", refreshRaw);

        if (refreshRaw == null)
            return ResponseEntity.status(401).build();

        try {
            String userId = tokenService.validateAndRotate(refreshRaw);
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));
            user.ensureDefaults();

            String roleName = (user.getRole() != null) ? user.getRole().name() : "USER";
            log.info("[Refresh] Success for user: {}, role: {}", userId, roleName);

            var issued = tokenService.issueTokens(userId, Map.of("role", roleName));

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, issued.refreshCookie().toString())
                    .body(Map.of("accessToken", issued.accessToken()));
        } catch (Exception e) {
            log.warn("[Refresh] Failed: {}", e.getMessage());
            return ResponseEntity.status(401).build();
        }
    }

    /** ✅ JWT access 기반 내 정보 */
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        String userId = (String) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", UserMeResponse.from(user)));
    }

    /** ✅ 로그아웃: refresh revoke + 쿠키 제거 + AuditLog(LOGOUT) */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(Authentication authentication, HttpServletRequest request) {

        String userId = null;
        if (authentication != null && authentication.getPrincipal() != null) {
            userId = (String) authentication.getPrincipal();
        }

        String refreshRaw = readCookie(request, "refreshToken");
        tokenService.revokeRefresh(refreshRaw);

        if (userId != null) {
            auditLogService.log(
                    AuditEventType.LOGOUT,
                    userId,
                    userId,
                    request,
                    Map.of());
        }

        var clear = tokenService.clearRefreshCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clear.toString())
                .body(Map.of("ok", true));
    }

    private String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null)
            return null;
        for (Cookie c : cookies) {
            if (name.equals(c.getName()))
                return c.getValue();
        }
        return null;
    }

    /*
     * ✅ 보안을 위해 debug-auth 엔드포인트 제거 또는 필드 제한
     * 
     * @GetMapping("/debug-auth")
     * public ResponseEntity<?> debugAuth(Authentication authentication) {
     * if (authentication == null)
     * return ResponseEntity.ok(Map.of("auth", null));
     * 
     * return ResponseEntity.ok(Map.of(
     * "principal", authentication.getPrincipal(),
     * "authorities", authentication.getAuthorities()));
     * }
     */

    /**
     * 내 로그인 히스토리 (Page 형태)
     */
    @GetMapping("/login-history")
    public Page<?> getLoginHistory(
            Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return Page.empty();
        }
        String userId = (String) authentication.getPrincipal();
        return loginHistoryRepository.findByUserIdOrderByLoginAtDesc(userId, PageRequest.of(page, size));
    }

    /**
     * 92. 토큰 상태 확인
     * GET /api/auth/status
     */
    @GetMapping("/status")
    public ResponseEntity<TokenStatusResponse> tokenStatus(
            Authentication authentication,
            HttpServletRequest request) {

        String userId = (authentication != null && authentication.getPrincipal() != null)
                ? (String) authentication.getPrincipal()
                : null;

        boolean accessValid = (userId != null);
        String refreshRaw = readCookie(request, "refreshToken");
        boolean refreshValid = false;

        if (refreshRaw != null) {
            try {
                String hash = tokenService.hashToken(refreshRaw);
                refreshValid = refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash).isPresent();
            } catch (Exception e) {
                refreshValid = false;
            }
        }

        long activeSessions = 0;
        if (userId != null) {
            activeSessions = refreshTokenRepository.countByUserIdAndRevokedAtIsNull(userId);
        }

        return ResponseEntity.ok(TokenStatusResponse.builder()
                .accessValid(accessValid)
                .refreshValid(refreshValid)
                .activeSessions(activeSessions)
                .build());
    }

    /**
     * 93. 모든 세션 로그아웃
     * POST /api/auth/logout-all
     */
    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAll(Authentication authentication, HttpServletRequest request) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
        }

        String userId = (String) authentication.getPrincipal();

        // 모든 활성 refresh 토큰 폐기
        List<RefreshToken> activeTokens = refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId);
        int revokedCount = 0;
        for (RefreshToken token : activeTokens) {
            token.setRevokedAt(Instant.now());
            refreshTokenRepository.save(token);
            revokedCount++;
        }

        // 감사 로그
        auditLogService.log(
                AuditEventType.LOGOUT_ALL,
                userId,
                userId,
                request,
                Map.of("revokedCount", revokedCount));

        // 현재 쿠키 제거
        var clear = tokenService.clearRefreshCookie();

        log.info("[Logout-All] userId={}, revokedCount={}", userId, revokedCount);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clear.toString())
                .body(Map.of("ok", true, "revokedSessions", revokedCount));
    }

    /**
     * 94. 최근 로그인 기록 (AuditLog 기반)
     * GET /api/auth/logins
     */
    @GetMapping("/logins")
    public ResponseEntity<?> recentLogins(
            Authentication authentication,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {

        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
        }

        String userId = (String) authentication.getPrincipal();

        List<AuditLog> logs = auditLogRepository.findByTargetUserIdAndEventTypeInOrderByCreatedAtDesc(
                userId,
                List.of(AuditEventType.LOGIN, AuditEventType.LOGOUT, AuditEventType.LOGOUT_ALL),
                PageRequest.of(0, Math.min(limit, 50)));

        List<LoginHistoryResponse> history = logs.stream()
                .map(LoginHistoryResponse::from)
                .toList();

        return ResponseEntity.ok(Map.of("logins", history));
    }

    /**
     * 95. 비정상 로그인 알림 (내부용)
     * POST /api/auth/alert (관리자 전용 권한 필요)
     */
    @PostMapping("/alert")
    public ResponseEntity<?> suspiciousLoginAlert(
            @RequestBody Map<String, Object> alertData,
            HttpServletRequest request) {

        String userId = (String) alertData.get("userId");
        String reason = (String) alertData.getOrDefault("reason", "unknown");

        if (userId == null || userId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId는 필수입니다."));
        }

        // 감사 로그에 비정상 로그인 기록
        auditLogService.log(
                AuditEventType.SUSPICIOUS_LOGIN,
                userId,
                "system",
                request,
                Map.of("reason", reason, "alertData", alertData));

        log.warn("[Suspicious Login Alert] userId={}, reason={}", userId, reason);

        return ResponseEntity.ok(Map.of("ok", true, "recorded", true));
    }
}
