package com.brickers.backend.report.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Report {

    @Id
    private String id;

    // 신고자 ID
    @Field("reporter_id")
    private String reporterId;

    // 신고 대상 (타입: USER, JOB, GALLERY, COMMENT, etc.)
    private String targetType;
    private String targetId;

    // 신고 사유
    private ReportReason reason;
    private String details; // 상세 설명

    // 처리 상태
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    // 처리 결과 (관리자 메모)
    private String resolutionNote;
    private String resolvedBy; // 처리한 관리자 ID

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;

    public void resolve(String adminId, String note) {
        if (this.status != ReportStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 신고입니다. status=" + this.status);
        }
        this.status = ReportStatus.RESOLVED;
        this.resolvedBy = adminId;
        this.resolutionNote = note;
        this.resolvedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void reject(String adminId, String note) {
        if (this.status != ReportStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 신고입니다. status=" + this.status);
        }
        this.status = ReportStatus.REJECTED;
        this.resolvedBy = adminId;
        this.resolutionNote = note;
        this.resolvedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = ReportStatus.CANCELED;
        this.updatedAt = LocalDateTime.now();
    }
}
