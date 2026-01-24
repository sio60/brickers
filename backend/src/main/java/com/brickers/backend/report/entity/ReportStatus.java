package com.brickers.backend.report.entity;

public enum ReportStatus {
    PENDING, // 접수됨 (처리 대기)
    RESOLVED, // 처리 완료 (승인/제재)
    REJECTED, // 반려 (문제 없음)
    CANCELED // 신고자가 취소함
}
