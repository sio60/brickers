package com.brickers.backend.payment.dto;

import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PaymentOrderResponse {
    private String orderId;
    private String orderNo;
    private String planName;
    private BigDecimal amount;
    private PaymentStatus status;
    private String checkoutUrl;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;

    public static PaymentOrderResponse from(PaymentOrder order) {
        return PaymentOrderResponse.builder()
                .orderId(order.getId())
                .orderNo(order.getOrderNo())
                .planName(order.getPlanName())
                .amount(order.getAmount())
                .status(order.getStatus())
                .checkoutUrl(order.getCheckoutUrl())
                .paidAt(order.getPaidAt())
                .createdAt(order.getCreatedAt())
                .build();
    }
}
