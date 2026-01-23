package com.brickers.backend.upload_s3.service;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    StoredFile storeImage(String userId, MultipartFile file);

    record StoredFile(
            String url, // "/uploads/.."
            String originalName,
            String contentType,
            long size) {
    }
}
