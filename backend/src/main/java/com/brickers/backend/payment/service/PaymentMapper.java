package com.brickers.backend.payment.service;

import com.brickers.backend.payment.dto.PaymentOrderResponse;
import com.brickers.backend.payment.entity.PaymentOrder;
import org.springframework.stereotype.Component;

/**
 * 🗺️ PaymentMapper
 * 
 * 결제 관련 엔티티와 DTO 간의 변환을 담당합니다.
 */
@Component
public class PaymentMapper {

    /**
     * PaymentOrder 엔티티를 응답 DTO로 변환합니다.
     */
    public PaymentOrderResponse toResponse(PaymentOrder order) {
        if (order == null)
            return null;
        return PaymentOrderResponse.from(order);
    }
}
