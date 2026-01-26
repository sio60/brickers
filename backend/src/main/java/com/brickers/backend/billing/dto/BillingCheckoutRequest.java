package com.brickers.backend.billing.dto;

import lombok.Data;

/**
 * 결제 세션 생성 요청
 */
@Data
public class BillingCheckoutRequest {
    private String planCode;  // PRO_MONTHLY, PRO_YEARLY
}
