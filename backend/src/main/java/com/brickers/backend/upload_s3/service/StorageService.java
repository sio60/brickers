package com.brickers.backend.upload_s3.service;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    StoredFile storeImage(String userId, MultipartFile file);

    // ✅ 바이트 배열 직접 저장 (LDR 등)
    StoredFile storeFile(String userId, String fileName, byte[] content, String contentType);

    record StoredFile(
            String url, // "/uploads/.."
            String originalName,
            String contentType,
            long size) {
    }
}
