package com.brickers.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    /**
     * 기존 API (디버그/확인용)
     */
    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(@AuthenticationPrincipal OAuth2User oAuth2User) {
        Map<String, Object> response = new HashMap<>();

        if (oAuth2User != null) {
            log.info("로그인 사용자 확인: authorities={}, attributes={}",
                    oAuth2User.getAuthorities(),
                    oAuth2User.getAttributes());

            response.put("authenticated", true);
            response.put("user", oAuth2User.getAttributes());
        } else {
            response.put("authenticated", false);
            response.put("message", "로그인 상태가 아닙니다.");
        }

        return response;
    }

    /**
     * ✅ 세션 상태 확인 (프론트 표준용)
     */
    @GetMapping("/session")
    public ResponseEntity<?> session(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }

        Map<String, Object> attrs = principal.getAttributes();

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", Map.of(
                        "name", attrs.getOrDefault("name", null),
                        "email", attrs.getOrDefault("email", null))));
    }

    /**
     * ✅ 로그아웃: 우리 서버 세션 종료
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        // 1) 세션 무효화
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        // 2) SecurityContext 정리
        SecurityContextHolder.clearContext();

        // 3) 컨테이너 logout (선택)
        try {
            request.logout();
        } catch (Exception e) {
            log.debug("request.logout() ignored: {}", e.getMessage());
        }

        return ResponseEntity.ok(Map.of("ok", true));
    }
}
