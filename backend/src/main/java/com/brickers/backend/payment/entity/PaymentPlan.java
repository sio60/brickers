package com.brickers.backend.payment.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

/**
 * 요금제/플랜 엔티티
 */
@Document(collection = "payment_plans")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentPlan {

    @Id
    private String id;

    // 플랜 코드 (PRO_MONTHLY, PRO_YEARLY 등)
    private String code;

    // 플랜 이름
    private String name;

    // 설명
    private String description;

    // 가격 (원)
    private BigDecimal price;

    // 기간 (일 단위, 30 = 월간, 365 = 연간)
    private Integer durationDays;

    // 활성화 여부
    @Builder.Default
    private Boolean active = true;

    // 정렬 순서
    @Builder.Default
    private Integer sortOrder = 0;
}
