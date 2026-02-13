package com.brickers.backend.payment.dto;

import com.brickers.backend.payment.entity.PaymentOrder;
// import com.brickers.backend.payment.entity.PaymentStatus; 
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
    private String status;
    private String checkoutUrl;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private String pgOrderId;
    private String cancelReason;
    private LocalDateTime canceledAt;

    public static PaymentOrderResponse from(PaymentOrder order) {
        try {
            String statusStr = order.getStatus() != null ? order.getStatus().name() : "UNKNOWN";
            return PaymentOrderResponse.builder()
                    .orderId(order.getId())
                    .orderNo(order.getOrderNo())
                    .planName(order.getPlanName())
                    .amount(order.getAmount())
                    .status(statusStr)
                    .checkoutUrl(order.getCheckoutUrl())
                    .paidAt(order.getPaidAt())
                    .createdAt(order.getCreatedAt())
                    .pgOrderId(order.getPgOrderId())
                    .cancelReason(order.getCancelReason())
                    .canceledAt(order.getCanceledAt())
                    .build();
        } catch (Throwable e) {
            return PaymentOrderResponse.builder()
                    .orderNo("DEBUG_ERROR")
                    .pgOrderId("Error: " + e.getClass().getName() + ": " + e.getMessage())
                    .status("FAILED")
                    .build();
        }
    }
}
