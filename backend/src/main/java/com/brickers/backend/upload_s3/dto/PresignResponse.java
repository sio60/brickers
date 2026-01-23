package com.brickers.backend.upload_s3.dto;

import lombok.Builder;

@Builder
public record PresignResponse(
                String key, // S3 object key
                String uploadUrl, // presigned PUT url
                String publicUrl, // public/cdn url for GET
                long expiresInSeconds) {
}
