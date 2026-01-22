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

@Service
@RequiredArgsConstructor
public class MyService {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    /** 내 프로필 조회 */
    public MyProfileResponse getMyProfile(OAuth2AuthenticationToken auth) {
        User user = currentUserService.get(auth);
        return toProfileResponse(user);
    }

    /** 내 프로필 수정(PATCH) */
    public MyProfileResponse updateMyProfile(OAuth2AuthenticationToken auth, MyProfileUpdateRequest req) {
        User user = currentUserService.get(auth);

        // nickname
        if (req.getNickname() != null) {
            String nickname = req.getNickname().trim();
            if (nickname.isEmpty())
                throw new IllegalArgumentException("닉네임은 비어 있을 수 없습니다.");
            if (nickname.length() > 20)
                throw new IllegalArgumentException("닉네임은 20자 이하여야 합니다.");
            user.setNickname(nickname);
        }

        // bio
        if (req.getBio() != null) {
            String bio = req.getBio().trim();
            if (bio.length() > 200)
                throw new IllegalArgumentException("자기소개는 200자 이하여야 합니다.");
            user.setBio(bio);
        }

        // profile image (URL만 허용 / 아니면 null 처리)
        if (req.getProfileImage() != null) {
            String img = req.getProfileImage().trim();
            user.setProfileImage(img.startsWith("http") ? img : null);
        }

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return toProfileResponse(user);
    }

    /** 내 멤버십 조회 */
    public MyMembershipResponse getMyMembership(OAuth2AuthenticationToken auth) {
        User user = currentUserService.get(auth);
        return MyMembershipResponse.builder()
                .membershipPlan(user.getMembershipPlan())
                .expiresAt(null)
                .build();
    }

    /** 회원 탈퇴(soft delete): accountState=DELETED + deletedAt 기록 */
    public DeleteMyAccountResponse requestDeleteMyAccount(OAuth2AuthenticationToken auth) {
        User user = currentUserService.get(auth);

        if (user.getAccountState() == AccountState.DELETED) {
            return DeleteMyAccountResponse.builder()
                    .success(false)
                    .message("이미 탈퇴 완료된 계정입니다.")
                    .build();
        }

        if (user.getAccountState() == AccountState.SUSPENDED) {
            return DeleteMyAccountResponse.builder()
                    .success(false)
                    .message("정지된 계정은 탈퇴할 수 없습니다. 관리자에게 문의하세요.")
                    .build();
        }

        user.setAccountState(AccountState.DELETED);
        if (user.getDeletedAt() == null)
            user.setDeletedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return DeleteMyAccountResponse.builder()
                .success(true)
                .message("회원 탈퇴가 정상적으로 처리되었습니다.")
                .build();
    }

    /** 응답 DTO 매핑 */
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
