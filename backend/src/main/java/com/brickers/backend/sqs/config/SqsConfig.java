package com.brickers.backend.sqs.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;

@Configuration
@Slf4j
public class SqsConfig {

    @Value("${aws.region:ap-northeast-2}")
    private String awsRegion;

    @Value("${aws.accessKeyId:}")
    private String accessKeyId;

    @Value("${aws.secretAccessKey:}")
    private String secretAccessKey;

    @Bean
    public SqsClient sqsClient() {
        log.info("✅ SQS Client 초기화 | region={}", awsRegion);

        // IAM Role 사용 (EC2) vs Access Key 사용 (로컬)
        if (accessKeyId != null && !accessKeyId.isBlank()) {
            log.info("   📍 Access Key 인증 사용");
            return SqsClient.builder()
                    .region(Region.of(awsRegion))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKeyId, secretAccessKey)
                    ))
                    .build();
        } else {
            log.info("   📍 IAM Role 인증 사용 (EC2 환경)");
            return SqsClient.builder()
                    .region(Region.of(awsRegion))
                    .build();
        }
    }
}
