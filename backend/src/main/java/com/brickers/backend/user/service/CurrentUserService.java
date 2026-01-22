package com.brickers.backend.user.service;

import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    /** 로그인한 현재 유저를 조회하고(소셜 provider 기반), 기본값/상태검사를 수행해서 반환 */
    public User get(OAuth2AuthenticationToken auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new IllegalStateException("인증 정보가 없습니다.");
        }

        String provider = auth.getAuthorizedClientRegistrationId();
        Map<String, Object> attributes = auth.getPrincipal().getAttributes();

        String providerId = extractProviderId(provider, attributes);

        User user = userRepository.findByProviderAndProviderId(provider, providerId)
                .orElseThrow(() -> new IllegalStateException("사용자 정보를 찾을 수 없습니다."));

        user.ensureDefaults();

        // ✅ 계정 상태 방어
        if (user.getAccountState() == AccountState.DELETED) {
            throw new IllegalStateException("탈퇴 완료된 계정입니다.");
        }
        if (user.getAccountState() == AccountState.SUSPENDED) {
            throw new IllegalStateException("정지된 계정입니다.");
        }

        return user;
    }

    /** provider별 providerId 추출 */
    private String extractProviderId(String provider, Map<String, Object> attributes) {
        if ("kakao".equals(provider)) {
            return String.valueOf(attributes.get("id"));
        }
        if ("google".equals(provider)) {
            return String.valueOf(attributes.get("sub"));
        }
        throw new IllegalStateException("지원하지 않는 OAuth2 provider: " + provider);
    }
}
