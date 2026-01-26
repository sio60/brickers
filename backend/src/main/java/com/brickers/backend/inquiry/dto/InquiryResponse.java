package com.brickers.backend.inquiry.dto;

import com.brickers.backend.inquiry.entity.Inquiry;
import com.brickers.backend.inquiry.entity.InquiryAnswer;
import com.brickers.backend.inquiry.entity.InquiryStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class InquiryResponse {
    private String id;
    private String userId;
    private String userEmail; // ✅ 추가
    private String title;
    private String content;
    private List<String> attachments;
    private InquiryStatus status;
    private AnswerDto answer;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class AnswerDto {
        private String content;
        private String answeredBy;
        private LocalDateTime answeredAt;
    }

    public static InquiryResponse from(Inquiry inquiry) {
        InquiryResponseBuilder builder = InquiryResponse.builder()
                .id(inquiry.getId())
                .userId(inquiry.getUserId())
                .title(inquiry.getTitle())
                .content(inquiry.getContent())
                .attachments(inquiry.getAttachments())
                .status(inquiry.getStatus())
                .createdAt(inquiry.getCreatedAt())
                .updatedAt(inquiry.getUpdatedAt());

        if (inquiry.getAnswer() != null) {
            InquiryAnswer ans = inquiry.getAnswer();
            builder.answer(AnswerDto.builder()
                    .content(ans.getContent())
                    .answeredBy(ans.getAnsweredBy())
                    .answeredAt(ans.getAnsweredAt())
                    .build());
        }

        return builder.build();
    }
}
