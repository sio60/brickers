package com.brickers.backend.user.service;

import com.brickers.backend.common.exception.ForbiddenException;
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
            // 로그인 필요 -> 403 or 401 중 선택인데, 지금 프로젝트는 403로 통일해도 됨
            throw new ForbiddenException("로그인이 필요합니다.");
        }

        String provider = auth.getAuthorizedClientRegistrationId();
        Map<String, Object> attributes = auth.getPrincipal().getAttributes();

        String providerId = extractProviderId(provider, attributes);
        if (providerId == null || providerId.isBlank() || "null".equals(providerId)) {
            throw new ForbiddenException("인증 정보가 올바르지 않습니다.");
        }

        User user = userRepository.findByProviderAndProviderId(provider, providerId)
                .orElseThrow(() -> new ForbiddenException("사용자 정보를 찾을 수 없습니다."));

        user.ensureDefaults();

        // ✅ 계정 상태 방어 (정책)
        AccountState st = user.getAccountState();

        // 탈퇴 요청/완료 유저는 접근 막는게 보통 안전
        if (st == AccountState.REQUESTED) {
            throw new ForbiddenException("탈퇴 처리 중인 계정입니다.");
        }
        if (st == AccountState.DELETED) {
            throw new ForbiddenException("탈퇴 완료된 계정입니다.");
        }
        if (st == AccountState.SUSPENDED) {
            throw new ForbiddenException("정지된 계정입니다.");
        }

        return user;
    }

    /** provider별 providerId 추출 */
    private String extractProviderId(String provider, Map<String, Object> attributes) {
        if ("kakao".equals(provider)) {
            Object id = attributes.get("id");
            return id == null ? null : String.valueOf(id);
        }
        if ("google".equals(provider)) {
            Object sub = attributes.get("sub");
            return sub == null ? null : String.valueOf(sub);
        }
        throw new ForbiddenException("지원하지 않는 OAuth2 provider: " + provider);
    }
}
