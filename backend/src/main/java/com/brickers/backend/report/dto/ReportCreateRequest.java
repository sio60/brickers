package com.brickers.backend.report.dto;

import com.brickers.backend.report.entity.ReportReason;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReportCreateRequest {
    @NotBlank
    private String targetType; // USER, POST, etc
    @NotBlank
    private String targetId;

    @NotNull
    private ReportReason reason;

    private String details;
}
