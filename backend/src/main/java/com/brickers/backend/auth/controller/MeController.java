package com.brickers.backend.auth.controller;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.entity.AuditLog;
import com.brickers.backend.audit.repository.AuditLogRepository;
import com.brickers.backend.auth.dto.LoginHistoryResponse;
import com.brickers.backend.auth.dto.TokenStatusResponse;
import com.brickers.backend.auth.dto.UserMeResponse;
import com.brickers.backend.auth.repository.RefreshTokenRepository;
import com.brickers.backend.auth.service.AuthTokenService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import com.brickers.backend.auth.repository.LoginHistoryRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 👤 MeController
 * 
 * 현재 로그인한 사용자 본인의 상태, 프로필, 로그인 히스토리 조회를 전담합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository userRepository;
    private final LoginHistoryRepository loginHistoryRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuthTokenService tokenService;

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

    /** 내 로그인 히스토리 (Page 형태) */
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

    /** 토큰 상태 확인 */
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

    /** 최근 로그인 기록 (AuditLog 기반) */
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
                List.of(AuditEventType.LOGIN, AuditEventType.LOGOUT),
                PageRequest.of(0, Math.min(limit, 50)));

        List<LoginHistoryResponse> history = logs.stream()
                .map(LoginHistoryResponse::from)
                .toList();

        return ResponseEntity.ok(Map.of("logins", history));
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
}
