package com.brickers.backend.auth;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.service.AuditLogService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        if (authentication instanceof OAuth2AuthenticationToken token) {
            String provider = token.getAuthorizedClientRegistrationId();
            Map<String, Object> attrs = token.getPrincipal().getAttributes();

            String providerId = null;
            if ("kakao".equals(provider)) {
                Object id = attrs.get("id");
                providerId = (id == null) ? null : String.valueOf(id);
            } else if ("google".equals(provider)) {
                Object sub = attrs.get("sub");
                providerId = (sub == null) ? null : String.valueOf(sub);
            }

            if (providerId != null && !providerId.isBlank() && !"null".equals(providerId)) {
                userRepository.findByProviderAndProviderId(provider, providerId).ifPresent(user -> {
                    user.ensureDefaults();

                    // ✅ lastLoginAt 업데이트
                    user.setLastLoginAt(LocalDateTime.now());
                    user.setUpdatedAt(LocalDateTime.now());
                    userRepository.save(user);

                    // ✅ AuditLog LOGIN 기록
                    auditLogService.log(
                            AuditEventType.LOGIN,
                            user.getId(),
                            user.getId(),
                            request,
                            Map.of("provider", provider));
                });
            }
        }

        // ✅ 로그인 성공 후 프론트로 리다이렉트 (너희 기존 정책에 맞춰 변경)
        // ex) response.sendRedirect(frontBaseUrl + "/auth/callback");
        response.sendRedirect("/");
    }
}
