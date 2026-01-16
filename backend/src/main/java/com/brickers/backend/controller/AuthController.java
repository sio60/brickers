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

@Slf4j
@RestController
@RequestMapping("/api/auth") // ✅ 프론트엔드와 맞추기 위해 /api/user에서 변경
@RequiredArgsConstructor
public class AuthController {

    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(@AuthenticationPrincipal OAuth2User oAuth2User) {
        Map<String, Object> response = new HashMap<>();

        
        if (oAuth2User != null) {
            log.info("로그인 사용자 확인: {}", oAuth2User.getAttributes().get("properties"));
            response.put("authenticated", true);
            response.put("user", oAuth2User.getAttributes());
        } else {
            response.put("authenticated", false);
            response.put("message", "로그인 상태가 아닙니다.");
        }

        return response;
    }
}