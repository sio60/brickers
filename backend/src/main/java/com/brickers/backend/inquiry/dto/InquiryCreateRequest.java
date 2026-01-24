package com.brickers.backend.inquiry.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class InquiryCreateRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String content;

    // 첨부파일 URL 목록 (선택)
    private List<String> attachments;
}
