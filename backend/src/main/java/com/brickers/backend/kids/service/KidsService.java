package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.KidsLevel;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsService {

    private final WebClient aiWebClient;
    private final GenerateJobRepository generateJobRepository;
    private final com.brickers.backend.upload_s3.service.StorageService storageService; // ✅ 추가

    /**
     * 레고 생성 + Job DB 저장
     * 
     * @param userId 사용자 ID (로그인 시 전달, 비로그인 시 null)
     */
    public Map<String, Object> generateBrick(String userId, MultipartFile file, String age, int budget) {
        log.info("AI 생성 요청 시작: UserId={}, Age={}, Budget={}", userId, age, budget);

        // ✅ 0. 입력 이미지 저장 (원본 보관)
        String sourceImageUrl = null;
        if (userId != null && !userId.isBlank() && !file.isEmpty()) {
            try {
                var stored = storageService.storeImage(userId, file);
                sourceImageUrl = stored.url();
            } catch (Exception e) {
                log.warn("이미지 저장 실패 (생성은 계속 진행): {}", e.getMessage());
            }
        }

        // ✅ 1. Job 엔티티 생성 (QUEUED 상태로 시작)
        GenerateJobEntity job = GenerateJobEntity.builder()
                .userId(userId)
                .level(ageToKidsLevel(age))
                .status(JobStatus.QUEUED)
                .stage(JobStage.THREE_D_PREVIEW)
                .title(file.getOriginalFilename())
                .sourceImageUrl(sourceImageUrl) // ✅ 저장된 이미지 URL
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .stageUpdatedAt(LocalDateTime.now())
                .build();
        job.ensureDefaults();

        // 사용자가 로그인한 경우에만 저장
        if (userId != null && !userId.isBlank()) {
            generateJobRepository.save(job);
            log.info("Job 생성 완료: jobId={}", job.getId());
        }

        // ✅ 2. Job 상태를 RUNNING으로 변경
        job.markRunning(JobStage.THREE_D_PREVIEW);
        if (userId != null && !userId.isBlank()) {
            generateJobRepository.save(job);
        }

        // 3. Python 서버로 보낼 데이터 포장 (Multipart)
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", file.getResource());
        builder.part("age", age);
        builder.part("budget", budget);

        try {
            // 4. Python 서버의 /api/v1/kids/process-all 호출
            Map<String, Object> response = aiWebClient.post()
                    .uri("/api/v1/kids/process-all")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .timeout(Duration.ofSeconds(300))
                    .block();

            log.info("AI 생성 완료: {}", response);

            // ✅ 5. 성공 시 Job 완료 처리
            if (userId != null && !userId.isBlank()) {
                // 결과 URL 저장
                if (response != null) {
                    // Preview Image URL (만약 AI가 주면)
                    if (response.containsKey("image_url")) {
                        job.setPreviewImageUrl(String.valueOf(response.get("image_url")));
                    }
                    // ✅ LDR URL -> 파일 시스템 읽기 -> StorageService(S3/Local) 저장 -> modelKey 업데이트
                    if (response.containsKey("ldrUrl")) {
                        String originalLdrUrl = String.valueOf(response.get("ldrUrl"));
                        try {
                            // 1. 파일명 추출
                            // 1. 파일명/경로 추출 (URL: /api/generated/brickify_.../result.ldr)
                            String urlStr = originalLdrUrl;
                            String relativePath = urlStr;
                            if (urlStr.contains("/api/generated/")) {
                                relativePath = urlStr
                                        .substring(urlStr.indexOf("/api/generated/") + "/api/generated/".length());
                            } else if (urlStr.contains("/generated/")) {
                                relativePath = urlStr.substring(urlStr.indexOf("/generated/") + "/generated/".length());
                            }

                            // 파일명만 따지 말고, 하위 폴더 포함해서 경로 잡기
                            String filename = relativePath;

                            // 2. 로컬(Volume) 경로에서 파일 읽기
                            // (Docker 배포 시 brickers-ai 결과물이 공유 볼륨에 있다고 가정)
                            java.nio.file.Path sourcePath = java.nio.file.Paths.get("../brickers-ai/public/generated",
                                    filename);

                            byte[] ldrContent;
                            if (java.nio.file.Files.exists(sourcePath)) {
                                ldrContent = java.nio.file.Files.readAllBytes(sourcePath);
                            } else {
                                throw new java.io.FileNotFoundException("Generated file not found at " + sourcePath);
                            }

                            // 3. StorageService를 통해 저장 (S3 or Local Uploads)
                            var stored = storageService.storeFile(userId, filename, ldrContent, "text/plain");

                            // 4. 저장된 스토리지 URL로 교체 (DB 저장용)
                            job.setModelKey(stored.url());
                            log.info("LDR 파일 스토리지 이관 완료: {}", stored.url());

                        } catch (Exception e) {
                            log.error("LDR 파일 처리 실패: {}", e.getMessage());
                            // 실패 시 원본 경로 유지
                            job.setModelKey(originalLdrUrl);
                        }
                    }
                }
                job.markDone();
                generateJobRepository.save(job);
                log.info("Job 완료: jobId={}", job.getId());
            }

            return response;

        } catch (Exception e) {
            log.error("AI 서버 통신 실패", e);

            // ✅ 6. 실패 시 Job 실패 처리
            if (userId != null && !userId.isBlank()) {
                job.markFailed(e.getMessage());
                generateJobRepository.save(job);
                log.info("Job 실패 처리: jobId={}", job.getId());
            }

            throw new RuntimeException("AI 서버가 응답하지 않습니다: " + e.getMessage());
        }
    }

    /**
     * age 문자열을 KidsLevel로 변환
     */
    private KidsLevel ageToKidsLevel(String age) {
        if (age == null)
            return KidsLevel.LEVEL_1;
        return switch (age.toLowerCase()) {
            case "3-5", "35" -> KidsLevel.LEVEL_1;
            case "6-7", "67" -> KidsLevel.LEVEL_2;
            case "8-10", "810" -> KidsLevel.LEVEL_3;
            default -> KidsLevel.LEVEL_1;
        };
    }
}