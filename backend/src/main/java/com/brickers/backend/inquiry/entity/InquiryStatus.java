package com.brickers.backend.inquiry.entity;

/**
 * 문의 상태
 */
public enum InquiryStatus {
    OPEN, // 접수됨 (답변 대기)
    ANSWERED, // 답변 완료
    CLOSED // 종료됨
}
