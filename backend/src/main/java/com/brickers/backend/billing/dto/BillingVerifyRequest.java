package com.brickers.backend.billing.dto;

import lombok.Data;

/**
 * Google Play 결제 검증 요청
 */
@Data
public class BillingVerifyRequest {
    private String purchaseToken;  // Google Play 구매 토큰
    private String productId;      // Google Play 상품 ID
    private String orderId;        // Google Play 주문 ID
}
