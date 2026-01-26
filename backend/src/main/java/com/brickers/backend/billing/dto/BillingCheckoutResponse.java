package com.brickers.backend.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 결제 세션 생성 응답
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingCheckoutResponse {
    private String sessionId;         // 내부 세션 ID
    private String googleProductId;   // Google Play 상품 ID
    private String planCode;
    private String planName;
}
