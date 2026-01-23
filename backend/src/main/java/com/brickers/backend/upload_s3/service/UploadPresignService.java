package com.brickers.backend.upload_s3.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.brickers.backend.upload_s3.dto.PresignResponse;

import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URL;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class UploadPresignService {

    private final S3Presigner presigner;

    @Value("${app.upload.s3.bucket}")
    private String bucket;
    @Value("${app.upload.s3.presign-exp-seconds}")
    private long expSeconds;
    @Value("${app.upload.s3.key-prefix}")
    private String keyPrefix;

    @Value("${app.upload.public-base-url}")
    private String publicBaseUrl;

    @Value("${app.upload.s3.allowed-content-types}")
    private String allowedContentTypesCsv;

    public PresignResponse presignImageUpload(String userId, String contentType, String originalName) {
        validateContentType(contentType);

        // ✅ key 규칙: uploads/{userId}/yyyy/MM/{uuid}.{ext}
        String ext = guessExt(contentType, originalName);
        LocalDate d = LocalDate.now();
        String key = String.format(
                "%s/%s/%04d/%02d/%s.%s",
                trimSlash(keyPrefix),
                userId,
                d.getYear(), d.getMonthValue(),
                UUID.randomUUID(),
                ext);

        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                // 필요 시 메타 추가:
                // .metadata(Map.of("originalName", safeMeta(originalName)))
                .build();

        PutObjectPresignRequest presignReq = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(expSeconds))
                .putObjectRequest(objectRequest)
                .build();

        URL url = presigner.presignPutObject(presignReq).url();

        // public/cdn url: base + "/" + key
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
        String publicUrl = base + "/" + key;

        return PresignResponse.builder()
                .key(key)
                .uploadUrl(url.toString())
                .publicUrl(publicUrl)
                .expiresInSeconds(expSeconds)
                .build();
    }

    private void validateContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            throw new IllegalArgumentException("contentType required");
        }
        Set<String> allowed = new HashSet<>();
        for (String s : allowedContentTypesCsv.split(","))
            allowed.add(s.trim());
        if (!allowed.contains(contentType.trim())) {
            throw new IllegalArgumentException("not allowed contentType: " + contentType);
        }
    }

    private String guessExt(String contentType, String originalName) {
        // contentType 우선
        if ("image/png".equals(contentType))
            return "png";
        if ("image/jpeg".equals(contentType))
            return "jpg";
        if ("image/webp".equals(contentType))
            return "webp";

        // fallback by name
        if (originalName != null) {
            String lower = originalName.toLowerCase();
            if (lower.endsWith(".png"))
                return "png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
                return "jpg";
            if (lower.endsWith(".webp"))
                return "webp";
        }
        return "bin";
    }

    private String trimSlash(String s) {
        if (s == null)
            return "uploads";
        String t = s;
        while (t.startsWith("/"))
            t = t.substring(1);
        while (t.endsWith("/"))
            t = t.substring(0, t.length() - 1);
        return t.isBlank() ? "uploads" : t;
    }
}
