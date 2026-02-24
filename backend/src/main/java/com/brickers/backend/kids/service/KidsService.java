package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.kids.dto.AgentLogRequest;
import com.brickers.backend.kids.entity.AgentTrace;
import com.brickers.backend.sqs.service.SqsProducerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsService {

    private final GenerateJobRepository jobRepository;
    private final KidsImageService kidsImageService;
    private final KidsJobService kidsJobService;
    private final KidsLogService kidsLogService;
    private final KidsAsyncWorker kidsAsyncWorker;
    private final SqsProducerService sqsProducerService;
    private final AiRenderClient aiRenderClient;

    @Value("${aws.sqs.enabled:false}")
    private boolean sqsEnabled;

    /**
     * 🚀 브릭 생성 시작 (Facade)
     */
    public Map<String, Object> startGeneration(String userId, String sourceImageUrl, String age, int budget,
            String title, String prompt, String language, String sourceType) {
        log.info("AI 생성 요청 접수: userId={}, title={}, sourceType={}", userId, title, sourceType);

        // 1. 이미지 확보 (프롬프트가 있으면 DALL-E 생성 및 S3 업로드)
        String finalImageUrl = sourceImageUrl;
        if ((finalImageUrl == null || finalImageUrl.isBlank()) && (prompt != null && !prompt.isBlank())) {
            finalImageUrl = kidsImageService.generateAndStoreImage(userId, prompt, age, title, language);
        }

        if (finalImageUrl == null || finalImageUrl.isBlank()) {
            throw new IllegalArgumentException("sourceImageUrl or prompt is required");
        }

        // 2. Job 엔티티 생성 및 기본값 설정
        GenerateJobEntity job = GenerateJobEntity.builder()
                .userId(userId)
                .status(JobStatus.QUEUED).stage(JobStage.THREE_D_PREVIEW)
                .sourceImageUrl(finalImageUrl).title(title).language(language)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .stageUpdatedAt(LocalDateTime.now()).build();
        job.ensureDefaults();
        jobRepository.save(job);

        // 3. 첫 로그 기록 (준비 단계)
        kidsLogService.addAgentLog(job.getId(), "QUEUE", "요청을 접수했어요. 곧 작업을 시작할게요.");

        // 4. 작업 위임 (SQS 또는 AsyncWorker)
        if (sqsEnabled) {
            sqsProducerService.sendJobRequest(job.getId(), userId, finalImageUrl, age, budget, language, sourceType);
        } else {
            kidsAsyncWorker.processGenerationAsync(job.getId(), userId, finalImageUrl, age, budget, language, sourceType);
        }

        return Map.of("jobId", job.getId(), "status", JobStatus.QUEUED);
    }

    // --- 하위 호환 오버로딩 ---
    public Map<String, Object> startGeneration(String userId, String sourceImageUrl, String age, int budget,
            String title) {
        return startGeneration(userId, sourceImageUrl, age, budget, title, null, null, null);
    }

    // --- 비즈니스 로직 전문 서비스 위임 ---
    public GenerateJobEntity getJobStatus(String jobId) {
        return kidsJobService.getJobStatus(jobId);
    }

    public void updateJobStage(String jobId, String stage) {
        kidsJobService.updateJobStage(jobId, stage);
    }

    public void updatePdfUrl(String jobId, String url) {
        kidsJobService.updatePdfUrl(jobId, url);
    }

    public void updateBackgroundUrl(String jobId, String url) {
        kidsJobService.updateBackgroundUrl(jobId, url);
    }

    public void updateScreenshotUrls(String jobId, Map<String, String> urls) {
        kidsJobService.updateScreenshotUrls(jobId, urls);
    }

    public void updateSuggestedTags(String jobId, List<String> tags) {
        kidsJobService.updateSuggestedTags(jobId, tags);
    }

    public void updateJobCategory(String jobId, String cat) {
        kidsJobService.updateJobCategory(jobId, cat);
    }

    public void saveAgentTrace(String jobId, AgentLogRequest req) {
        kidsLogService.saveAgentTrace(jobId, req);
    }

    public SseEmitter subscribeAgentLogs(String jobId) {
        return kidsLogService.subscribeAgentLogs(jobId);
    }

    public List<AgentTrace> getAgentTraces(String jobId) {
        return kidsLogService.getAgentTraces(jobId);
    }

    public Map<String, Object> createBackgroundComposition(MultipartFile file,
            String subject) {
        return aiRenderClient.generateBackgroundComposite(file, subject);
    }
}
