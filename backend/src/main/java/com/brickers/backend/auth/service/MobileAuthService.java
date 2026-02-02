package com.brickers.backend.auth.service;

import com.brickers.backend.auth.dto.MobileLoginResponse;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.entity.UserRole;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MobileAuthService {

    private final UserRepository userRepository;
    private final AuthTokenService tokenService;
    private final WebClient.Builder webClientBuilder;

    /**
     * 카카오 access token으로 로그인 처리
     * 1. 카카오 API로 사용자 정보 조회
     * 2. DB에서 사용자 찾거나 생성
     * 3. JWT 발급
     */
    public MobileLoginResponse loginWithKakaoToken(String kakaoAccessToken) {
        // 1. 카카오 API로 사용자 정보 조회
        KakaoUserInfo kakaoUser = getKakaoUserInfo(kakaoAccessToken);
        log.info("[MobileAuth] Kakao user: id={}, nickname={}", kakaoUser.id, kakaoUser.nickname);

        // 2. DB에서 사용자 찾거나 생성
        User user = userRepository.findByProviderAndProviderId("kakao", kakaoUser.id)
                .orElseGet(() -> createNewUser(kakaoUser));

        // 로그인 시간 업데이트
        user.setLastLoginAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user.ensureDefaults();
        userRepository.save(user);

        // 3. JWT 발급
        String roleName = (user.getRole() != null) ? user.getRole().name() : "USER";
        var issued = tokenService.issueTokens(user.getId(), Map.of(
                "provider", "kakao",
                "role", roleName));

        log.info("[MobileAuth] JWT issued for user: {}", user.getId());

        return MobileLoginResponse.builder()
                .accessToken(issued.accessToken())
                .refreshToken(issued.refreshCookie().getValue())
                .user(MobileLoginResponse.MobileUserInfo.builder()
                        .id(user.getId())
                        .nickname(user.getNickname())
                        .email(user.getEmail())
                        .profileImage(user.getProfileImage())
                        .role(roleName)
                        .build())
                .build();
    }

    /**
     * 카카오 API로 사용자 정보 조회
     */
    private KakaoUserInfo getKakaoUserInfo(String accessToken) {
        WebClient webClient = webClientBuilder.build();

        Map<String, Object> response = webClient.get()
                .uri("https://kapi.kakao.com/v2/user/me")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null) {
            throw new RuntimeException("Failed to get Kakao user info");
        }

        String id = String.valueOf(response.get("id"));
        Map<String, Object> kakaoAccount = (Map<String, Object>) response.get("kakao_account");
        Map<String, Object> profile = kakaoAccount != null
                ? (Map<String, Object>) kakaoAccount.get("profile")
                : null;

        String nickname = profile != null ? (String) profile.get("nickname") : null;
        String profileImage = profile != null ? (String) profile.get("profile_image_url") : null;
        String email = kakaoAccount != null ? (String) kakaoAccount.get("email") : null;

        return new KakaoUserInfo(id, nickname, email, profileImage);
    }

    /**
     * 새 사용자 생성
     */
    private User createNewUser(KakaoUserInfo kakaoUser) {
        User user = User.builder()
                .provider("kakao")
                .providerId(kakaoUser.id)
                .nickname(kakaoUser.nickname != null ? kakaoUser.nickname : "User" + kakaoUser.id.substring(0, 6))
                .email(kakaoUser.email)
                .profileImage(kakaoUser.profileImage)
                .role(UserRole.USER)
                .membershipPlan(MembershipPlan.FREE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        user.ensureDefaults();
        return userRepository.save(user);
    }

    private record KakaoUserInfo(String id, String nickname, String email, String profileImage) {
    }
}
