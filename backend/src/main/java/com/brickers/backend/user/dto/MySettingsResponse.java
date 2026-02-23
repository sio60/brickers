package com.brickers.backend.user.dto;

import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.entity.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MySettingsResponse {
    private String id;

    private String provider;

    private String email;
    private String nickname;

    private String profileImage;
    private String bio;

    private UserRole role;
    private MembershipPlan membershipPlan;
    private AccountState accountState;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLoginAt;

    public static MySettingsResponse from(User u) {
        return MySettingsResponse.builder()
                .id(u.getId())
                .provider(u.getProvider())
                .email(u.getEmail())
                .nickname(u.getNickname())
                .profileImage(u.getProfileImage())
                .bio(u.getBio())
                .role(u.getRole())
                .membershipPlan(u.getMembershipPlan())
                .accountState(u.getAccountState())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .lastLoginAt(u.getLastLoginAt())
                .build();
    }
}
