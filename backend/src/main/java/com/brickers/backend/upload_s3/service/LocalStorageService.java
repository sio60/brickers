package com.brickers.backend.upload_s3.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LocalStorageService implements StorageService {

    private static final Map<String, String> EXT_BY_CONTENT_TYPE = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp");

    @Value("${app.upload.root-dir:./uploads}")
    private String rootDir;

    @Value("${app.upload.public-prefix:/uploads}")
    private String publicPrefix;

    @Override
    public StoredFile storeImage(String userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("파일이 비었습니다.");
        }

        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 업로드 가능합니다.");
        }

        String ext = EXT_BY_CONTENT_TYPE.get(ct);
        if (ext == null) {
            throw new IllegalArgumentException("허용되지 않는 이미지 타입입니다. (png/jpg/webp만)");
        }

        LocalDate now = LocalDate.now();
        String safeUser = (userId == null || userId.isBlank()) ? "guest" : userId;

        Path base = Paths.get(rootDir).toAbsolutePath().normalize();
        Path dir = base.resolve(Paths.get(
                safeUser,
                String.valueOf(now.getYear()),
                String.format("%02d", now.getMonthValue()))).normalize();

        try {
            Files.createDirectories(dir);

            String original = StringUtils.hasText(file.getOriginalFilename())
                    ? Paths.get(file.getOriginalFilename()).getFileName().toString()
                    : "upload." + ext;

            String filename = UUID.randomUUID() + "." + ext;
            Path target = dir.resolve(filename).normalize();

            // path traversal 방어
            if (!target.startsWith(dir)) {
                throw new IllegalStateException("잘못된 파일 경로");
            }

            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            String url = publicPrefix + "/" + safeUser + "/" + now.getYear() + "/"
                    + String.format("%02d", now.getMonthValue()) + "/" + filename;

            return new StoredFile(url, original, ct, file.getSize());

        } catch (Exception e) {
            throw new RuntimeException("파일 저장 실패: " + e.getMessage(), e);
        }
    }
}
