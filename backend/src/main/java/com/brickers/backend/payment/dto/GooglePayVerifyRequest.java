package com.brickers.backend.payment.dto;

import lombok.Data;

import java.util.Map;

@Data
public class GooglePayVerifyRequest {
    // 구글 페이에서 받은 전체 paymentData
    private Map<String, Object> paymentData;

    // 구매하려는 플랜 ID (필요 시)
    private String planId;
}
