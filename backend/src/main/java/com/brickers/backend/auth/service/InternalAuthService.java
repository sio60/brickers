package com.brickers.backend.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * 🔒 InternalAuthService
 * 
 * 시스템 내부 API 토큰(X-Internal-Token) 검증 및
 * 관리자 권한 확인 로직을 중앙 집중 관리합니다.
 */
@Slf4j
@Service
public class InternalAuthService {

    @Value("${INTERNAL_API_TOKEN:}")
    private String internalApiToken;

    /**
     * 전달받은 토큰이 서버에 설정된 내부 API 토큰과 일치하는지 확인합니다.
     */
    public boolean isInternalAuthorized(String token) {
        return internalApiToken != null && !internalApiToken.isBlank() && internalApiToken.equals(token);
    }

    /**
     * 현재 요청자가 관리자(ROLE_ADMIN) 권한을 가지고 있는지 확인합니다.
     */
    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    /**
     * 내부 토큰 인증 또는 관리자 권한 중 하나라도 충족하는지 확인합니다.
     */
    public boolean isAdminOrInternal(String token) {
        return isInternalAuthorized(token) || isAdmin();
    }
}
