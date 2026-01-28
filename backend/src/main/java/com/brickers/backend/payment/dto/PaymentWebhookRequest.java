package com.brickers.backend.payment.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class PaymentWebhookRequest {
    private String pgOrderId;
    private String paymentKey;
    private String status; // 각 PG사마다 상태값이 다르므로 서비스에서 맵핑 필요
    private BigDecimal amount; // ✅ 금액 검증용
    private Map<String, Object> rawData;
}
