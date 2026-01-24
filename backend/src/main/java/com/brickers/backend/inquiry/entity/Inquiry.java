package com.brickers.backend.inquiry.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 문의 엔티티
 */
@Document(collection = "inquiries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Inquiry {

    @Id
    private String id;

    // 문의 작성자
    @Indexed
    private String userId;

    // 문의 제목
    private String title;

    // 문의 내용
    private String content;

    // 첨부파일 URL 목록
    @Builder.Default
    private List<String> attachments = new ArrayList<>();

    // 상태
    @Builder.Default
    private InquiryStatus status = InquiryStatus.OPEN;

    // 답변
    private InquiryAnswer answer;

    // 생성/수정 시간
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public void addAttachment(String url) {
        if (this.attachments == null) {
            this.attachments = new ArrayList<>();
        }
        this.attachments.add(url);
    }

    public boolean canEdit() {
        return this.status == InquiryStatus.OPEN;
    }

    public boolean canDelete() {
        return this.status == InquiryStatus.OPEN;
    }
}
