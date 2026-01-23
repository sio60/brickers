package com.brickers.backend.upload_s3.dto;

import lombok.Builder;

@Builder
public record UploadCompleteRequest(
        String key,
        String originalName,
        String contentType,
        Long size, // optional
        String etag // optional: S3 PUT 응답 헤더 ETag
) {
}
