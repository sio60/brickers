package com.brickers.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * 인증 결과 처리 컨트롤러
 * 
 * OAuth2 로그인 엔드포인트 (/auth/*는 Spring Security가 처리):
 * - 카카오: /auth/kakao
 * - 구글: /auth/google
 * 
 * 이 컨트롤러는 로그인 결과 처리:
 * - 성공: /api/auth/success
 * - 실패: /api/auth/failure
 * - 사용자 정보: /api/auth/me
 */
@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    /**
     * 로그인 성공 시 호출
     */
    @GetMapping("/success")
    public Map<String, Object> loginSuccess(@AuthenticationPrincipal OAuth2User oAuth2User) {
        Map<String, Object> response = new HashMap<>();

        if (oAuth2User != null) {
            response.put("status", "success");
            response.put("message", "소셜 로그인 성공!");
            response.put("user", oAuth2User.getAttributes());
            log.info("로그인 성공 - user: {}", oAuth2User.getAttributes());
        } else {
            response.put("status", "error");
            response.put("message", "사용자 정보를 가져올 수 없습니다.");
        }

        return response;
    }

    /**
     * 로그인 실패 시 호출
     */
    @GetMapping("/failure")
    public Map<String, Object> loginFailure() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", "소셜 로그인 실패");
        log.error("로그인 실패");
        return response;
    }

    /**
     * 현재 로그인한 사용자 정보 조회
     */
    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(@AuthenticationPrincipal OAuth2User oAuth2User) {
        Map<String, Object> response = new HashMap<>();

        if (oAuth2User != null) {
            response.put("authenticated", true);
            response.put("user", oAuth2User.getAttributes());
        } else {
            response.put("authenticated", false);
            response.put("message", "로그인이 필요합니다.");
        }

        return response;
    }

    /**
     * 로그인 안내
     */
    @GetMapping("/login")
    public Map<String, Object> loginInfo() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "소셜 로그인을 이용하세요.");
        response.put("kakao", "/auth/kakao");
        response.put("google", "/auth/google");
        return response;
    }
}
