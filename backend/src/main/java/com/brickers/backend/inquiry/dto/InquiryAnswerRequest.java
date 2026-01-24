package com.brickers.backend.inquiry.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InquiryAnswerRequest {
    @NotBlank
    private String content;
}
