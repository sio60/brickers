package com.brickers.backend.payment.dto;

import com.brickers.backend.payment.entity.PaymentPlan;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PaymentPlanResponse {
    private String id;
    private String code;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer durationDays;

    public static PaymentPlanResponse from(PaymentPlan plan) {
        return PaymentPlanResponse.builder()
                .id(plan.getId())
                .code(plan.getCode())
                .name(plan.getName())
                .description(plan.getDescription())
                .price(plan.getPrice())
                .durationDays(plan.getDurationDays())
                .build();
    }
}
