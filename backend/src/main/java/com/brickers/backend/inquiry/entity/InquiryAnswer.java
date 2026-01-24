package com.brickers.backend.inquiry.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 문의 답변 (Inquiry 내 embedded)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InquiryAnswer {

    // 답변 내용
    private String content;

    // 답변 작성자 (관리자 ID)
    private String answeredBy;

    // 답변 시간
    private LocalDateTime answeredAt;

    // 수정 시간
    private LocalDateTime updatedAt;
}
