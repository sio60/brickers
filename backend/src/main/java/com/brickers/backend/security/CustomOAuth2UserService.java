package com.brickers.backend.security;

import com.brickers.backend.entity.User;
import com.brickers.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * OAuth2 사용자 정보 처리 서비스
 * 카카오/구글 로그인 시 사용자 정보를 MongoDB에 저장
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        // OAuth2 제공자 (kakao, google)
        String provider = userRequest.getClientRegistration().getRegistrationId();

        // 사용자 정보 추출 및 저장
        saveOrUpdateUser(provider, oAuth2User);

        return oAuth2User;
    }

    private void saveOrUpdateUser(String provider, OAuth2User oAuth2User) {
        String providerId;
        String email = null;
        String nickname = null;
        String profileImage = null;

        Map<String, Object> attributes = oAuth2User.getAttributes();

        if ("kakao".equals(provider)) {
            // 카카오 사용자 정보 추출
            providerId = String.valueOf(attributes.get("id"));

            @SuppressWarnings("unchecked")
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            if (kakaoAccount != null) {
                email = (String) kakaoAccount.get("email");

                @SuppressWarnings("unchecked")
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                if (profile != null) {
                    nickname = (String) profile.get("nickname");
                    profileImage = (String) profile.get("profile_image_url");
                }
            }

            log.info("카카오 로그인 - providerId: {}, email: {}, nickname: {}", providerId, email, nickname);

        } else if ("google".equals(provider)) {
            // 구글 사용자 정보 추출
            providerId = (String) attributes.get("sub");
            email = (String) attributes.get("email");
            nickname = (String) attributes.get("name");
            profileImage = (String) attributes.get("picture");

            log.info("구글 로그인 - providerId: {}, email: {}, nickname: {}", providerId, email, nickname);

        } else {
            log.warn("지원하지 않는 OAuth2 제공자: {}", provider);
            return;
        }

        // 기존 사용자 조회 또는 새로 생성
        final String finalEmail = email;
        final String finalNickname = nickname;
        final String finalProfileImage = profileImage;

        User user = userRepository.findByProviderAndProviderId(provider, providerId)
                .map(existingUser -> {
                    // 기존 사용자 정보 업데이트
                    existingUser.setEmail(finalEmail);
                    existingUser.setNickname(finalNickname);
                    existingUser.setProfileImage(finalProfileImage);
                    existingUser.setUpdatedAt(LocalDateTime.now());
                    return existingUser;
                })
                .orElseGet(() -> {
                    // 새 사용자 생성
                    return User.builder()
                            .provider(provider)
                            .providerId(providerId)
                            .email(finalEmail)
                            .nickname(finalNickname)
                            .profileImage(finalProfileImage)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                });

        userRepository.save(user);
        log.info("사용자 저장 완료 - id: {}, provider: {}", user.getId(), provider);
    }
}
