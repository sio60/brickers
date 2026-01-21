package com.brickers.backend.user.service;

import com.brickers.backend.user.dto.DeleteMyAccountResponse;
import com.brickers.backend.user.dto.MyMembershipResponse;
import com.brickers.backend.user.dto.MyProfileResponse;
import com.brickers.backend.user.dto.MyProfileUpdateRequest;
import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MyService {

    private final UserRepository userRepository;

    /*
     * =======================
     * GET /api/my/profile
     * =======================
     */
    public MyProfileResponse getMyProfile(OAuth2AuthenticationToken auth) {
        User user = findCurrentUser(auth);

        return toProfileResponse(user);
    }

    /*
     * =======================
     * PATCH /api/my/profile
     * =======================
     */
    public MyProfileResponse updateMyProfile(
            OAuth2AuthenticationToken auth,
            MyProfileUpdateRequest req) {
        User user = findCurrentUser(auth);

        // nickname
        if (req.getNickname() != null) {
            String nickname = req.getNickname().trim();
            if (nickname.isEmpty()) {
                throw new IllegalArgumentException("닉네임은 비어 있을 수 없습니다.");
            }
            if (nickname.length() > 20) {
                throw new IllegalArgumentException("닉네임은 20자 이하여야 합니다.");
            }
            user.setNickname(nickname);
        }

        // bio
        if (req.getBio() != null) {
            String bio = req.getBio().trim();
            if (bio.length() > 200) {
                throw new IllegalArgumentException("자기소개는 200자 이하여야 합니다.");
            }
            user.setBio(bio);
        }

        // profile image
        if (req.getProfileImage() != null) {
            String img = req.getProfileImage().trim();
            user.setProfileImage(img.isEmpty() ? null : img);
        }

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return toProfileResponse(user);
    }

    /*
     * =======================
     * GET /api/my/membership
     * =======================
     */
    public MyMembershipResponse getMyMembership(OAuth2AuthenticationToken auth) {
        User user = findCurrentUser(auth);

        return MyMembershipResponse.builder()
                .membershipPlan(user.getMembershipPlan())
                .expiresAt(null)
                .build();
    }

    /*
     * =======================
     * DELETE /api/my/account
     * =======================
     */
    public DeleteMyAccountResponse requestDeleteMyAccount(OAuth2AuthenticationToken auth) {
        User user = findCurrentUser(auth);

        user.setAccountState(AccountState.REQUESTED);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return DeleteMyAccountResponse.builder()
                .success(true)
                .message("회원 탈퇴 요청이 정상적으로 처리되었습니다.")
                .build();
    }

    /*
     * =======================
     * 공통: 현재 로그인 유저 조회
     * =======================
     */
    private User findCurrentUser(OAuth2AuthenticationToken auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new IllegalStateException("인증 정보가 없습니다.");
        }

        String provider = auth.getAuthorizedClientRegistrationId();
        Map<String, Object> attributes = auth.getPrincipal().getAttributes();

        String providerId = extractProviderId(provider, attributes);

        User user = userRepository.findByProviderAndProviderId(provider, providerId)
                .orElseThrow(() -> new IllegalStateException("사용자 정보를 찾을 수 없습니다."));

        user.ensureDefaults();
        return user;
    }

    private String extractProviderId(String provider, Map<String, Object> attributes) {
        if ("kakao".equals(provider)) {
            return String.valueOf(attributes.get("id"));
        }
        if ("google".equals(provider)) {
            return String.valueOf(attributes.get("sub"));
        }
        throw new IllegalStateException("지원하지 않는 OAuth2 provider: " + provider);
    }

    /*
     * =======================
     * Response Mapper
     * =======================
     */
    private MyProfileResponse toProfileResponse(User user) {
        return MyProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .bio(user.getBio())
                .profileImage(user.getProfileImage())
                .membershipPlan(user.getMembershipPlan())
                .accountState(user.getAccountState())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
