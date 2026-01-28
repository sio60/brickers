package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.KidsLevel;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.upload_s3.service.StorageService;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsService {

    private final GenerateJobRepository generateJobRepository;
    private final StorageService storageService;
    private final KidsAsyncWorker kidsAsyncWorker;
    private final UserRepository userRepository;

    public Map<String, Object> startGeneration(String userId, MultipartFile file, String age, int budget) {
        log.info("AI 생성 요청 접수: userId={}, age={}, budget={}", safe(userId), safe(age), budget);

        // ✅ 보안 강화: 서버 측 멤버십 권한 확인
        if (userId == null) {
            throw new IllegalStateException("로그인이 필요한 서비스입니다.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + userId));

        if (user.getMembershipPlan() != MembershipPlan.PRO) {
            log.warn("[Security] Unauthorized AI generation attempt by non-PRO user. userId={}", userId);
            throw new IllegalStateException("PRO 사용자 전용 기능입니다. 업그레이드가 필요합니다.");
        }

        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("file is empty");

        // ✅ async 안정성: bytes로 복사
        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (Exception e) {
            throw new IllegalArgumentException("failed to read multipart bytes: " + e.getMessage(), e);
        }
        String originalFilename = file.getOriginalFilename();
        String contentType = file.getContentType();

        // 0) 입력 이미지 저장 (원본 보관)
        String sourceImageUrl = null;
        try {
            var stored = storageService.storeImage(userId, file);
            sourceImageUrl = stored.url();
        } catch (Exception e) {
            log.warn("원본 이미지 저장 실패(생성 계속): {}", e.getMessage());
        }

        // 1) Job 생성/저장
        GenerateJobEntity job = GenerateJobEntity.builder()
                .userId(userId) // null 허용
                .level(ageToKidsLevel(age))
                .status(JobStatus.QUEUED)
                .stage(JobStage.THREE_D_PREVIEW)
                .title(originalFilename)
                .sourceImageUrl(sourceImageUrl)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .stageUpdatedAt(LocalDateTime.now())
                .build();
        job.ensureDefaults();

        generateJobRepository.save(job);
        log.info("[Brickers] Job saved to DB. jobId={}, userId={}", job.getId(), safe(userId));

        // 2) ✅ 진짜 Async 워커로 넘김 (같은 클래스 self-call 문제 제거)
        kidsAsyncWorker.processGenerationAsync(
                job.getId(),
                userId,
                fileBytes,
                originalFilename,
                contentType,
                age,
                budget);

        // 3) 즉시 응답
        return Map.of("jobId", job.getId(), "status", JobStatus.QUEUED);
    }

    public GenerateJobEntity getJobStatus(String jobId) {
        log.info("[Brickers] Polling Job Status. jobId={}", jobId);
        return generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));
    }

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

    private String safe(String s) {
        return s == null ? "null" : s;
    }
}
