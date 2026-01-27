package com.brickers.backend.upload_s3.config;

import com.brickers.backend.upload_s3.service.LocalStorageService;
import com.brickers.backend.upload_s3.service.S3StorageService;
import com.brickers.backend.upload_s3.service.StorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * 환경변수 app.upload.provider에 따라 StorageService 빈 분기
 * - LOCAL: LocalStorageService (로컬 개발)
 * - S3: S3StorageService (배포 환경)
 */
@Configuration
@Slf4j
public class StorageConfig {

    /**
     * 로컬 스토리지 서비스 (provider=LOCAL 일 때)
     */
    @Bean
    @Primary
    @ConditionalOnProperty(name = "app.upload.provider", havingValue = "LOCAL", matchIfMissing = true)
    public StorageService localStorageService() {
        log.info("✅ StorageService: LOCAL 모드 활성화 (로컬 디스크 저장)");
        return new LocalStorageService();
    }

    /**
     * S3 스토리지 서비스 (provider=S3 일 때)
     */
    @Bean
    @Primary
    @ConditionalOnProperty(name = "app.upload.provider", havingValue = "S3")
    public StorageService s3StorageService(
            @Value("${app.upload.s3.bucket}") String bucket,
            @Value("${app.upload.s3.region}") String region,
            @Value("${app.upload.s3.access-key}") String accessKey,
            @Value("${app.upload.s3.secret-key}") String secretKey,
            @Value("${app.upload.s3.key-prefix}") String keyPrefix,
            @Value("${app.upload.public-base-url}") String publicBaseUrl) {
        log.info("✅ StorageService: S3 모드 활성화 (bucket={})", bucket);
        return new S3StorageService(bucket, region, accessKey, secretKey, keyPrefix, publicBaseUrl);
    }
}
