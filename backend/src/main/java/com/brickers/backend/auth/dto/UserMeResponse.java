package com.brickers.backend.auth.dto;

import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.entity.UserRole;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record UserMeResponse(
        String id,
        String email,
        String nickname,
        String profileImage,
        String bio,
        UserRole role,
        MembershipPlan membershipPlan,
        AccountState accountState,
        LocalDateTime lastLoginAt) {
    public static UserMeResponse from(User u) {
        return UserMeResponse.builder()
                .id(u.getId())
                .email(u.getEmail())
                .nickname(u.getNickname())
                .profileImage(u.getProfileImage())
                .bio(u.getBio())
                .role(u.getRole())
                .membershipPlan(u.getMembershipPlan())
                .accountState(u.getAccountState())
                .lastLoginAt(u.getLastLoginAt())
                .build();
    }
}
