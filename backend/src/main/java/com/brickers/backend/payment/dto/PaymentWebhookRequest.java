package com.brickers.backend.payment.dto;

import lombok.Data;

import java.util.Map;

@Data
public class PaymentWebhookRequest {
    private String pgOrderId;
    private String paymentKey;
    private String status; // 각 PG사마다 상태값이 다르므로 서비스에서 맵핑 필요
    private Map<String, Object> rawData;
}
