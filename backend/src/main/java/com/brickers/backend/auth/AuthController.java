package com.brickers.backend.auth;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.service.AuditLogService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;

    /**
     * (선택) 기존 API – 디버그/개발용
     * 👉 운영에서는 프론트에서 사용하지 않는 걸 권장
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(OAuth2AuthenticationToken auth) {
        if (auth == null) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "attributes", auth.getPrincipal().getAttributes()));
    }

    /**
     * ✅ 세션 상태 확인 (실서비스 표준 API)
     * - DB(User) 기준
     * - ban/SUSPENDED면 CurrentUserService에서 403 발생
     */
    @GetMapping("/session")
    public ResponseEntity<?> session(OAuth2AuthenticationToken auth) {
        if (auth == null) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }

        User me = currentUserService.get(auth); // ← 여기서 ban/탈퇴 차단

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", Map.of(
                        "id", me.getId(),
                        "nickname", me.getNickname(),
                        "email", me.getEmail(),
                        "role", me.getRole(),
                        "membershipPlan", me.getMembershipPlan(),
                        "accountState", me.getAccountState())));
    }

    /**
     * ✅ 로그아웃
     * - 세션 종료
     * - AuditLog(LOGOUT) 기록
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            OAuth2AuthenticationToken auth,
            HttpServletRequest request) {
        String userId = null;

        // 로그인 상태면 로그 기록
        try {
            User me = currentUserService.get(auth);
            userId = me.getId();
        } catch (Exception e) {
            // 이미 세션 만료/비로그인 상태여도 logout은 성공 처리
            log.debug("logout without authenticated user");
        }

        if (userId != null) {
            auditLogService.log(
                    AuditEventType.LOGOUT,
                    userId, // target
                    userId, // actor (본인)
                    request,
                    Map.of());
        }

        // 세션 무효화
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        SecurityContextHolder.clearContext();
        try {
            request.logout();
        } catch (Exception e) {
            log.debug("request.logout() ignored: {}", e.getMessage());
        }

        return ResponseEntity.ok(Map.of("ok", true));
    }
}
