package com.brickers.backend.admin.user.dto;

import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.entity.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserDto {
    private String id;
    private String email;
    private String nickname;
    private String profileImage;
    private UserRole role;
    private String provider;
    private MembershipPlan membershipPlan;
    private AccountState accountState;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private LocalDateTime suspendedAt;
    private String suspendedReason;

    public static AdminUserDto from(User user) {
        return AdminUserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .profileImage(user.getProfileImage())
                .role(user.getRole())
                .provider(user.getProvider())
                .membershipPlan(user.getMembershipPlan())
                .accountState(user.getAccountState())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .suspendedAt(user.getSuspendedAt())
                .suspendedReason(user.getSuspendedReason())
                .build();
    }
}
