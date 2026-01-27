package com.brickers.backend.upload_s3.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * S3에 직접 파일을 업로드하는 StorageService 구현체
 * 배포 환경에서 사용
 */
@Slf4j
public class S3StorageService implements StorageService {

    private static final Map<String, String> EXT_BY_CONTENT_TYPE = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp",
            "application/octet-stream", "glb",
            "model/gltf-binary", "glb",
            "text/plain", "ldr",
            "application/json", "json");

    private final S3Client s3Client;
    private final String bucket;
    private final String keyPrefix;
    private final String publicBaseUrl;

    public S3StorageService(
            @Value("${app.upload.s3.bucket}") String bucket,
            @Value("${app.upload.s3.region}") String region,
            @Value("${app.upload.s3.access-key}") String accessKey,
            @Value("${app.upload.s3.secret-key}") String secretKey,
            @Value("${app.upload.s3.key-prefix}") String keyPrefix,
            @Value("${app.upload.public-base-url}") String publicBaseUrl) {
        this.bucket = bucket;
        this.keyPrefix = keyPrefix;
        this.publicBaseUrl = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;

        // S3 Client 생성
        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();

        log.info("✅ S3StorageService initialized: bucket={}, region={}", bucket, region);
    }

    @Override
    public StoredFile storeFile(String userId, String fileName, byte[] content, String contentType) {
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("파일 내용이 비었습니다.");
        }

        String ext = guessExtension(fileName, contentType);
        String key = buildS3Key(userId, fileName, ext);

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(content));

            String publicUrl = publicBaseUrl + "/" + key;
            log.info("✅ S3 업로드 완료: key={}, size={}", key, content.length);

            return new StoredFile(publicUrl, fileName, contentType, content.length);
        } catch (Exception e) {
            log.error("❌ S3 업로드 실패: key={}, error={}", key, e.getMessage());
            throw new RuntimeException("S3 업로드 실패: " + e.getMessage(), e);
        }
    }

    @Override
    public StoredFile storeImage(String userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("파일이 비었습니다.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 업로드 가능합니다.");
        }

        String ext = EXT_BY_CONTENT_TYPE.getOrDefault(contentType, "bin");
        String originalName = StringUtils.hasText(file.getOriginalFilename())
                ? file.getOriginalFilename()
                : "upload." + ext;
        String key = buildS3Key(userId, originalName, ext);

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String publicUrl = publicBaseUrl + "/" + key;
            log.info("✅ S3 이미지 업로드 완료: key={}, size={}", key, file.getSize());

            return new StoredFile(publicUrl, originalName, contentType, file.getSize());
        } catch (IOException e) {
            log.error("❌ S3 이미지 업로드 실패: error={}", e.getMessage());
            throw new RuntimeException("S3 이미지 업로드 실패: " + e.getMessage(), e);
        }
    }

    /**
     * S3 키 생성: {keyPrefix}/{userId}/{yyyy}/{MM}/{uuid}_{filename}.{ext}
     */
    private String buildS3Key(String userId, String fileName, String ext) {
        LocalDate now = LocalDate.now();
        String safeUser = (userId == null || userId.isBlank()) ? "guest" : userId;

        String prefix = (keyPrefix == null || keyPrefix.isBlank()) ? "uploads" : keyPrefix;
        prefix = prefix.replaceAll("^/+|/+$", ""); // 앞뒤 슬래시 제거

        String finalFileName;
        if (fileName != null && !fileName.isBlank()) {
            // 파일명에서 경로 부분 제거
            String baseName = fileName.replaceAll(".*[/\\\\]", "");
            finalFileName = UUID.randomUUID() + "_" + baseName;
        } else {
            finalFileName = UUID.randomUUID() + "." + ext;
        }

        return String.format("%s/%s/%04d/%02d/%s",
                prefix, safeUser, now.getYear(), now.getMonthValue(), finalFileName);
    }

    private String guessExtension(String fileName, String contentType) {
        // 파일명에서 확장자 추출
        if (fileName != null && fileName.contains(".")) {
            return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
        }
        // contentType에서 추출
        return EXT_BY_CONTENT_TYPE.getOrDefault(contentType, "bin");
    }
}
