package com.brickers.backend.upload_s3.dto;

import lombok.Builder;

@Builder
public record PresignRequest(
                String contentType,
                String originalName) {
}
