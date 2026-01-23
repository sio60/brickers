package com.brickers.backend.upload_s3.dto;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record UploadCompleteResponse(
                String id,
                String key,
                String publicUrl,
                String originalName,
                String contentType,
                Long size,
                String etag,
                LocalDateTime createdAt) {
}
