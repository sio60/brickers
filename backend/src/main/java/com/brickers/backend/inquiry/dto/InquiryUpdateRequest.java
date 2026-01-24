package com.brickers.backend.inquiry.dto;

import lombok.Data;

@Data
public class InquiryUpdateRequest {
    private String title;
    private String content;
}
