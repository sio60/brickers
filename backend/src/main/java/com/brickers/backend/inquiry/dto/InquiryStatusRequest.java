package com.brickers.backend.inquiry.dto;

import com.brickers.backend.inquiry.entity.InquiryStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InquiryStatusRequest {
    @NotNull
    private InquiryStatus status;
}
