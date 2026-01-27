package com.brickers.backend.upload_s3.dto;

import lombok.Builder;

@Builder
public record UploadResponse(
        String id, // ✅ 업로드 고유 ID (UploadFile 엔티티 ID)
        String url, // "/uploads/....png"
        String originalName,
        String contentType,
        long size) {
}
