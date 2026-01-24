package com.brickers.backend.report.dto;

import com.brickers.backend.report.entity.ReportStatus;
import lombok.Data;

import jakarta.validation.constraints.NotBlank;

@Data
public class ReportResolveRequest {
    private boolean approve;

    @NotBlank
    private String note;
}