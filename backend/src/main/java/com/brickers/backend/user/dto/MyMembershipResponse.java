package com.brickers.backend.user.dto;

import com.brickers.backend.user.entity.MembershipPlan;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MyMembershipResponse {

    private MembershipPlan membershipPlan;

    // 추후 결제 붙이면 사용
    private LocalDateTime expiresAt;
}
