package com.brickers.backend.auth.controller;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.service.AuditLogService;
import com.brickers.backend.auth.dto.UserMeResponse;
import com.brickers.backend.auth.service.AuthTokenService;
import com.brickers.backend.auth.service.AuthTokenService.IssuedTokens;
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

    /** ✅ refresh-cookie로 access 재발급 + refresh rotation */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request) {
        String refreshRaw = readCookie(request, "refreshToken");
        if (refreshRaw == null)
            return ResponseEntity.status(401).build();

        try {
            String userId = tokenService.validateAndRotate(refreshRaw);

            // access에 넣을 claims는 필요 시 추가 (role, provider 등)
            var issued = tokenService.issueTokens(userId, Map.of());

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, issued.refreshCookie().toString())
                    .body(Map.of("accessToken", issued.accessToken()));
        } catch (Exception e) {
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
}
