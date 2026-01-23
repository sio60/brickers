package com.brickers.backend.upload_s3.dto;

import lombok.Builder;

@Builder
public record UploadResponse(
                String url, // "/uploads/....png"
                String originalName,
                String contentType,
                long size) {
}
