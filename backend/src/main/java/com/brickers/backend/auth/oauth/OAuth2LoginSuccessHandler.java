package com.brickers.backend.auth.oauth;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.service.AuditLogService;
import com.brickers.backend.auth.service.AuthTokenService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import com.brickers.backend.auth.repository.LoginHistoryRepository;
import com.brickers.backend.auth.entity.LoginHistory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final LoginHistoryRepository loginHistoryRepository;
    private final AuditLogService auditLogService;
    private final AuthTokenService tokenService;

    @Value("${app.front-base-url:http://localhost:5173}")
    private String frontBaseUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        String userId = null;
        String provider = null;
        String role = "USER"; // 기본값 설정

        if (authentication instanceof OAuth2AuthenticationToken token) {
            provider = token.getAuthorizedClientRegistrationId();
            Map<String, Object> attrs = token.getPrincipal().getAttributes();

            String providerId = extractProviderId(provider, attrs);
            if (providerId != null && !providerId.isBlank() && !"null".equals(providerId)) {

                User user = userRepository.findByProviderAndProviderId(provider, providerId).orElse(null);
                if (user != null) {
                    user.ensureDefaults();
                    user.setLastLoginAt(LocalDateTime.now());
                    user.setUpdatedAt(LocalDateTime.now());
                    userRepository.save(user);

                    userId = user.getId();
                    role = (user.getRole() == null) ? "USER" : user.getRole().name();

                    auditLogService.log(
                            AuditEventType.LOGIN,
                            userId,
                            userId,
                            request,
                            Map.of("provider", provider));

                    // ✅ [New] Login History
                    loginHistoryRepository.save(LoginHistory.builder()
                            .userId(userId)
                            .ipAddress(request.getRemoteAddr())
                            .userAgent(request.getHeader("User-Agent"))
                            .build());
                }
            }
        }

        if (userId == null) {
            String failUrl = normalizeFront(frontBaseUrl) + "/auth/failure";
            response.sendRedirect(failUrl);
            return;
        }

        // ✅ JWT 토큰 발급 (access는 응답 바디로 주는 게 아니라 refresh로 뽑는 구조라 refreshCookie만 심어도 됨)
        // 다만, 지금은 "로그인 성공 즉시 refresh-cookie 세팅"만 하고 프론트가 /api/auth/refresh를 호출하도록 설계.
        var issued = tokenService.issueTokens(userId, Map.of(
                "provider", provider,
                "role", role));

        response.addHeader("Set-Cookie", issued.refreshCookie().toString());

        String redirectUrl = normalizeFront(frontBaseUrl) + "/auth/success";
        log.info("[OAuth2Success/JWT] set refresh cookie, redirect -> {}", redirectUrl);
        response.sendRedirect(redirectUrl);
    }

    private String extractProviderId(String provider, Map<String, Object> attrs) {
        if ("kakao".equals(provider)) {
            Object id = attrs.get("id");
            return (id == null) ? null : String.valueOf(id);
        }
        if ("google".equals(provider)) {
            Object sub = attrs.get("sub");
            return (sub == null) ? null : String.valueOf(sub);
        }
        return null;
    }

    private String normalizeFront(String base) {
        if (base == null || base.isBlank())
            return "http://localhost:5173";
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }
}
