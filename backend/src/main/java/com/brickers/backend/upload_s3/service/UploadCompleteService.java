package com.brickers.backend.upload_s3.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.brickers.backend.upload_s3.dto.UploadCompleteRequest;
import com.brickers.backend.upload_s3.dto.UploadCompleteResponse;
import com.brickers.backend.upload_s3.entity.UploadFile;
import com.brickers.backend.upload_s3.repository.UploadFileRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UploadCompleteService {

    private final UploadFileRepository uploadFileRepository;

    @Value("${app.upload.s3.key-prefix}")
    private String keyPrefix;

    @Value("${app.upload.public-base-url}")
    private String publicBaseUrl;

    public UploadCompleteResponse complete(String userId, UploadCompleteRequest req) {
        if (req == null || req.key() == null || req.key().isBlank()) {
            throw new IllegalArgumentException("key required");
        }

        String prefix = trimSlash(keyPrefix) + "/" + userId + "/";
        if (!req.key().startsWith(prefix)) {
            throw new IllegalStateException("invalid key (not yours)");
        }

        String base = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;

        String publicUrl = base + "/" + req.key();

        UploadFile saved = uploadFileRepository.save(
                UploadFile.builder()
                        .userId(userId)
                        .key(req.key())
                        .publicUrl(publicUrl)
                        .originalName(req.originalName())
                        .contentType(req.contentType())
                        .size(req.size())
                        .etag(req.etag())
                        .createdAt(LocalDateTime.now())
                        .build());

        return UploadCompleteResponse.builder()
                .id(saved.getId())
                .key(saved.getKey())
                .publicUrl(saved.getPublicUrl())
                .originalName(saved.getOriginalName())
                .contentType(saved.getContentType())
                .size(saved.getSize())
                .etag(saved.getEtag())
                .createdAt(saved.getCreatedAt())
                .build();
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
