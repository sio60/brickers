package com.brickers.backend.auth.controller;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.service.AuditLogService;
import com.brickers.backend.auth.dto.MobileKakaoLoginRequest;
import com.brickers.backend.auth.dto.MobileLoginResponse;
import com.brickers.backend.auth.service.MobileAuthService;
import com.brickers.backend.auth.service.AuthTokenService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthTokenService tokenService;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final MobileAuthService mobileAuthService;

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

    /**
     * 모바일 카카오 로그인
     * POST /api/auth/mobile/kakao
     *
     * 앱에서 카카오 SDK로 로그인 후 받은 access token을 전송하면
     * 백엔드에서 카카오 API로 사용자 정보 조회 후 JWT 발급
     */
    @PostMapping("/mobile/kakao")
    public ResponseEntity<MobileLoginResponse> mobileKakaoLogin(
            @RequestBody MobileKakaoLoginRequest request,
            HttpServletRequest httpRequest) {

        log.info("[MobileAuth] Kakao login request received");

        if (request.getKakaoAccessToken() == null || request.getKakaoAccessToken().isBlank()) {
            log.warn("[MobileAuth] Missing kakaoAccessToken");
            return ResponseEntity.badRequest().build();
        }

        try {
            MobileLoginResponse response = mobileAuthService.loginWithKakaoToken(request.getKakaoAccessToken());

            // 감사 로그
            auditLogService.log(
                    AuditEventType.LOGIN,
                    response.getUser().getId(),
                    response.getUser().getId(),
                    httpRequest,
                    Map.of("provider", "kakao", "platform", "mobile"));

            log.info("[MobileAuth] Login success for user: {}", response.getUser().getId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("[MobileAuth] Login failed: {}", e.getMessage(), e);
            return ResponseEntity.status(401).build();
        }
    }
}
