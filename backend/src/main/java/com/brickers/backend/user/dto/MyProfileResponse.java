package com.brickers.backend.user.dto;

import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MyProfileResponse {

    private String id;

    private String email;
    private String nickname;
    private String bio;
    private String profileImage;

    private MembershipPlan membershipPlan;
    private AccountState accountState;
    private UserRole role;

    // 선택 (UI에서 필요하면)
    private LocalDateTime createdAt;
}
