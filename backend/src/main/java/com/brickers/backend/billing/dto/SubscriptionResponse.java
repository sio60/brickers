package com.brickers.backend.billing.dto;

import com.brickers.backend.billing.entity.Subscription;
import com.brickers.backend.billing.entity.SubscriptionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 현재 구독 상태 응답
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionResponse {
    private String id;
    private String planCode;
    private SubscriptionStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;
    private Boolean autoRenew;
    private boolean active;

    public static SubscriptionResponse from(Subscription sub) {
        return SubscriptionResponse.builder()
                .id(sub.getId())
                .planCode(sub.getPlanCode())
                .status(sub.getStatus())
                .startedAt(sub.getStartedAt())
                .expiresAt(sub.getExpiresAt())
                .autoRenew(sub.getAutoRenew())
                .active(sub.isActive())
                .build();
    }
}
