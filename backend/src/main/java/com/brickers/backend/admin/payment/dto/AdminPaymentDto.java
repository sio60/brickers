package com.brickers.backend.admin.payment.dto;

import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminPaymentDto {
    private String id;
    private String orderNo;
    private String userId;
    private String pgProvider;
    private String itemName; // Using planName as itemName
    private java.math.BigDecimal amount;
    private PaymentStatus status;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime canceledAt;
    private String cancelReason;

    public static AdminPaymentDto from(PaymentOrder order) {
        return AdminPaymentDto.builder()
                .id(order.getId())
                .orderNo(order.getOrderNo())
                .userId(order.getUserId())
                .pgProvider(order.getPgProvider())
                .itemName(order.getPlanName()) // Map planName to itemName
                .amount(order.getAmount())
                .status(order.getStatus())
                .paidAt(order.getPaidAt())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .canceledAt(order.getCanceledAt())
                .cancelReason(order.getCancelReason())
                .build();
    }
}
