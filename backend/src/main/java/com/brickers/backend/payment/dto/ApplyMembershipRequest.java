package com.brickers.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 결제 성공 후 멤버십 적용을 위한 내부 호출 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplyMembershipRequest {
    private String userId;
    private String planCode;
    private String orderId; // 연결된 결제 주문 (optional)
}
