package com.brickers.backend.report.dto;

import com.brickers.backend.report.entity.Report;
import com.brickers.backend.report.entity.ReportReason;
import com.brickers.backend.report.entity.ReportStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReportResponse {
    private String id;
    private String reporterId;
    private String targetType;
    private String targetId;
    private ReportReason reason;
    private String details;
    private ReportStatus status;
    private String resolutionNote; // 결과 메모 (사용자에게 보여줄지 정책 결정, 보통은 결과만 보여줌)
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    public static ReportResponse from(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .reporterId(report.getReporterId())
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .reason(report.getReason())
                .details(report.getDetails())
                .status(report.getStatus())
                .resolutionNote(report.getResolutionNote())
                .createdAt(report.getCreatedAt())
                .resolvedAt(report.getResolvedAt())
                .build();
    }
}
