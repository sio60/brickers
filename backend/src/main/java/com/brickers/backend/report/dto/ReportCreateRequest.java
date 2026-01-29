package com.brickers.backend.report.dto;

import com.brickers.backend.report.entity.ReportReason;
import com.brickers.backend.report.entity.ReportTargetType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReportCreateRequest {

    // ✅ String → Enum
    @NotNull
    private ReportTargetType targetType;

    @NotBlank
    private String targetId;

    @NotNull
    private ReportReason reason;

    private String details;
}
