package com.brickers.backend.billing.dto;

import com.brickers.backend.payment.entity.PaymentPlan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 요금제 조회 응답
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingPlanResponse {
    private String id;
    private String code;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer durationDays;
    private String googleProductId;  // Google Play 상품 ID

    public static BillingPlanResponse from(PaymentPlan plan) {
        return BillingPlanResponse.builder()
                .id(plan.getId())
                .code(plan.getCode())
                .name(plan.getName())
                .description(plan.getDescription())
                .price(plan.getPrice())
                .durationDays(plan.getDurationDays())
                .googleProductId(mapToGoogleProductId(plan.getCode()))
                .build();
    }

    private static String mapToGoogleProductId(String code) {
        // Google Play Console에 등록된 상품 ID와 매핑
        return switch (code) {
            case "PRO_MONTHLY" -> "brickers_pro_monthly";
            case "PRO_YEARLY" -> "brickers_pro_yearly";
            default -> null;
        };
    }
}
