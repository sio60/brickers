package com.brickers.backend.report.dto;

import com.brickers.backend.report.entity.ReportStatus;
import lombok.Data;

@Data
public class ReportResolveRequest {
    private boolean approve; // true: 승인(제재), false: 반려
    private String note; // 처리 사유
}
