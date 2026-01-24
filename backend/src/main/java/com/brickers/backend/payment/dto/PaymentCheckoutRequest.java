package com.brickers.backend.payment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PaymentCheckoutRequest {
    @NotBlank
    private String planId; // 선택한 요금제 ID
}
