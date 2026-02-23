package com.brickers.backend.auth.service;

import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.entity.UserRole;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId();
        saveOrUpdateUser(provider, oAuth2User);

        return oAuth2User;
    }

    private void saveOrUpdateUser(String provider, OAuth2User oAuth2User) {
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String providerId = null;
        String email = null;
        String nickname = null;
        String profileImage = null;

        if ("kakao".equals(provider)) {
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
        } else if ("google".equals(provider)) {
            providerId = String.valueOf(attributes.get("sub"));
            email = (String) attributes.get("email");
            nickname = (String) attributes.get("name");
            profileImage = (String) attributes.get("picture");
        } else {
            log.warn("지원하지 않는 OAuth2 제공자: {}", provider);
            return;
        }

        if (providerId == null || providerId.isBlank()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_provider_id"),
                    "OAuth2 providerId를 가져오지 못했습니다. provider=" + provider);
        }

        LocalDateTime now = LocalDateTime.now();

        final String providerFinal = provider;
        final String providerIdFinal = providerId;

        final String emailFinal = (email != null && !email.isBlank()) ? email.trim().toLowerCase() : null;
        final String nicknameFinal = (nickname != null && !nickname.isBlank()) ? nickname.trim() : null;

        final String profileImageFinal = (profileImage != null && profileImage.trim().startsWith("http"))
                ? profileImage.trim()
                : null;

        User user = userRepository.findByProviderAndProviderId(providerFinal, providerIdFinal)
                .map(existingUser -> {
                    existingUser.ensureDefaults();

                    if (existingUser.getAccountState() == AccountState.REQUESTED) {
                        throw new OAuth2AuthenticationException(new OAuth2Error("account_requested"), "탈퇴 요청된 계정입니다.");
                    }
                    if (existingUser.getAccountState() == AccountState.DELETED) {
                        throw new OAuth2AuthenticationException(new OAuth2Error("account_deleted"), "탈퇴 완료된 계정입니다.");
                    }
                    if (existingUser.getAccountState() == AccountState.SUSPENDED) {
                        throw new OAuth2AuthenticationException(new OAuth2Error("account_suspended"), "정지된 계정입니다.");
                    }

                    if (emailFinal != null) {
                        existingUser.setEmail(emailFinal);
                    }

                    if ((existingUser.getNickname() == null || existingUser.getNickname().isBlank())
                            && nicknameFinal != null && !nicknameFinal.isBlank()) {
                        existingUser.setNickname(resolveUniqueNickname(nicknameFinal, providerIdFinal));
                    }

                    if ((existingUser.getProfileImage() == null || existingUser.getProfileImage().isBlank())
                            && profileImageFinal != null && !profileImageFinal.isBlank()) {
                        existingUser.setProfileImage(profileImageFinal);
                    }

                    existingUser.setUpdatedAt(now);
                    existingUser.setLastLoginAt(now);

                    return existingUser;
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .provider(providerFinal)
                            .providerId(providerIdFinal)
                            .email(emailFinal)
                            .nickname(resolveUniqueNickname(nicknameFinal, providerIdFinal))
                            .profileImage(profileImageFinal)
                            .bio("자기소개를 해주세요!")
                            .role(UserRole.USER)
                            .membershipPlan(MembershipPlan.FREE)
                            .accountState(AccountState.ACTIVE)
                            .lastLoginAt(now)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();

                    newUser.ensureDefaults();
                    return newUser;
                });

        userRepository.save(user);

        log.info("사용자 저장 완료 - id: {}, provider: {}, role: {}, membershipPlan: {}, accountState: {}",
                user.getId(), providerFinal, user.getRole(), user.getMembershipPlan(), user.getAccountState());
    }

    private String resolveUniqueNickname(String rawNickname, String seed) {
        String fallback = "User" + (seed != null && seed.length() >= 6 ? seed.substring(0, 6) : "000000");
        String base = (rawNickname != null && !rawNickname.isBlank()) ? rawNickname.trim() : fallback;
        if (base.length() > 20) {
            base = base.substring(0, 20);
        }

        if (!userRepository.existsByNickname(base)) {
            return base;
        }

        for (int i = 1; i <= 9999; i++) {
            String suffix = "_" + i;
            int baseLen = Math.max(1, 20 - suffix.length());
            String candidate = base.length() > baseLen ? base.substring(0, baseLen) : base;
            candidate = candidate + suffix;
            if (!userRepository.existsByNickname(candidate)) {
                return candidate;
            }
        }

        String fallbackUnique = "User" + (System.currentTimeMillis() % 1_000_000_000L);
        return fallbackUnique.length() > 20 ? fallbackUnique.substring(0, 20) : fallbackUnique;
    }
}
