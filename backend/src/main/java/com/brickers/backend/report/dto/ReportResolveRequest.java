package com.brickers.backend.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportResolveRequest {

    @NotNull
    private ResolveAction action; // APPROVE / REJECT

    @NotBlank
    private String note; // 관리자 메모 (필수)

    public enum ResolveAction {
        APPROVE, REJECT
    }
}
