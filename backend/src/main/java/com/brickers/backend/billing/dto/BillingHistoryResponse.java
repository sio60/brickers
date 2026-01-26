package com.brickers.backend.billing.dto;

import com.brickers.backend.billing.entity.Subscription;
import com.brickers.backend.billing.entity.SubscriptionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 결제 이력 응답
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingHistoryResponse {
    private String id;
    private String planCode;
    private SubscriptionStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;
    private LocalDateTime canceledAt;
    private Boolean autoRenew;

    public static BillingHistoryResponse from(Subscription sub) {
        return BillingHistoryResponse.builder()
                .id(sub.getId())
                .planCode(sub.getPlanCode())
                .status(sub.getStatus())
                .startedAt(sub.getStartedAt())
                .expiresAt(sub.getExpiresAt())
                .canceledAt(sub.getCanceledAt())
                .autoRenew(sub.getAutoRenew())
                .build();
    }
}
