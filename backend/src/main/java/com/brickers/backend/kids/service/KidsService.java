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

import com.brickers.backend.sqs.service.SqsProducerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsService {

    private final GenerateJobRepository generateJobRepository;
    private final StorageService storageService;
    private final KidsAsyncWorker kidsAsyncWorker;
    private final com.brickers.backend.kids.client.AiRenderClient aiRenderClient; // ✅ [NEW]
    private final UserRepository userRepository;
    private final SqsProducerService sqsProducerService;

    // === CoScientist Agent Log Streaming ===
    private static final int MAX_LOG_BUFFER_SIZE = 100;
    private final ConcurrentHashMap<String, List<String>> agentLogBuffer = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<SseEmitter>> agentLogEmitters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> agentLogLastWrite = new ConcurrentHashMap<>();

    @Value("${APP_OPENAI_API_KEY}")
    private String openaiApiKey;

    @Value("${aws.sqs.enabled:false}")
    private boolean sqsEnabled;

    private final org.springframework.web.reactive.function.client.WebClient.Builder webClientBuilder;

    public Map<String, Object> startGeneration(String userId, String sourceImageUrl, String age, int budget,
            String title, String prompt) { // prompt 추가
        log.info("AI 생성 요청 접수: userId={}, sourceImageUrl={}, age={}, budget={}, title={}, prompt={}",
                safe(userId), sourceImageUrl, safe(age), budget, safe(title), safe(prompt));

        String finalImageUrl = sourceImageUrl;

        // 0) 프롬프트가 있으면 DALL-E로 이미지 생성 -> S3 업로드
        if ((finalImageUrl == null || finalImageUrl.isBlank()) && (prompt != null && !prompt.isBlank())) {
            try {
                log.info("[Brickers] 프롬프트로 이미지 생성 시작: {}", prompt);
                byte[] imageBytes = generateImageFromPrompt(prompt);
                String fileName = "dalle_" + java.util.UUID.randomUUID() + ".png";

                // S3 업로드
                var stored = storageService.storeFile(userId, fileName, imageBytes, "image/png");
                finalImageUrl = stored.url(); // Record getter
                log.info("[Brickers] DALL-E 이미지 S3 업로드 완료: {}", finalImageUrl);
            } catch (Exception e) {
                log.error("[Brickers] 이미지 생성 실패: {}", e.getMessage());
                throw new RuntimeException("이미지 생성 실패: " + e.getMessage());
            }
        }

        if (finalImageUrl == null || finalImageUrl.isBlank()) {
            throw new IllegalArgumentException("sourceImageUrl or prompt is required");
        }

        // 1) Job 생성/저장
        GenerateJobEntity job = GenerateJobEntity.builder()
                .userId(userId) // null 허용
                .level(ageToKidsLevel(age))
                .status(JobStatus.QUEUED)
                .stage(JobStage.THREE_D_PREVIEW)
                .sourceImageUrl(finalImageUrl) // S3 URL
                .title(title) // 작업 제목 (파일명)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .stageUpdatedAt(LocalDateTime.now())
                .build();
        job.ensureDefaults();

        generateJobRepository.save(job);
        log.info("[Brickers] Job saved to DB. jobId={}, userId={}", job.getId(), safe(userId));

        // 2) SQS 또는 Async 워커로 작업 전달
        if (sqsEnabled) {
            // ✅ SQS로 작업 요청 전송
            log.info("[Brickers] SQS로 작업 요청 전송 | jobId={}", job.getId());
            sqsProducerService.sendJobRequest(
                    job.getId(),
                    userId,
                    finalImageUrl,
                    age,
                    budget);
        } else {
            // ⚠️ 기존 방식 (직접 호출) - 개발/테스트용 (SQS 비활성 시 fallback)
            log.info("[Brickers] 직접 호출 모드 (SQS 비활성화) | jobId={}", job.getId());

            kidsAsyncWorker.processGenerationAsync(
                    job.getId(),
                    userId,
                    finalImageUrl,
                    age,
                    budget);
        }

        // 3) 즉시 응답
        return Map.of("jobId", job.getId(), "status", JobStatus.QUEUED);
    }

    // 기존 메서드 오버로딩 유지 (하위 호환)
    public Map<String, Object> startGeneration(String userId, String sourceImageUrl, String age, int budget,
            String title) {
        return startGeneration(userId, sourceImageUrl, age, budget, title, null);
    }

    private byte[] generateImageFromPrompt(String prompt) {
        // OpenAI DALL-E 3 API 호출
        // Request Body: { "model": "dall-e-3", "prompt": "...", "n": 1, "size":
        // "1024x1024", "response_format": "b64_json" }
        Map<String, Object> requestBody = Map.of(
                "model", "dall-e-3",
                "prompt", prompt + " (LEGO style, simple, clean background)", // 스타일 강제
                "n", 1,
                "size", "1024x1024",
                "response_format", "b64_json");

        Map response = webClientBuilder
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)) // 10MB
                .build().post()
                .uri("https://api.openai.com/v1/images/generations")
                .header("Authorization", "Bearer " + openaiApiKey)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block(java.time.Duration.ofSeconds(60)); // 타임아웃 60초

        if (response == null || !response.containsKey("data")) {
            throw new RuntimeException("OpenAI 응답 없음");
        }

        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        if (data.isEmpty()) {
            throw new RuntimeException("OpenAI 이미지 데이터 없음");
        }

        String b64Json = (String) data.get(0).get("b64_json");
        return java.util.Base64.getDecoder().decode(b64Json);
    }

    public GenerateJobEntity getJobStatus(String jobId) {
        log.info("[Brickers] Polling Job Status. jobId={}", jobId);
        return generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));
    }

    /**
     * Job stage 업데이트 (AI Server에서 호출)
     */
    public void updateJobStage(String jobId, String stageName) {
        log.info("[Brickers] Job Stage 업데이트 | jobId={} | stage={}", jobId, stageName);

        GenerateJobEntity job = generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));

        // String → JobStage enum 변환
        JobStage stage;
        try {
            stage = JobStage.valueOf(stageName);
        } catch (IllegalArgumentException e) {
            log.warn("[Brickers] 알 수 없는 stage 무시 | jobId={} | stageName={}", jobId, stageName);
            return;
        }

        // Job 상태를 RUNNING으로 변경 (첫 stage 업데이트 시)
        if (job.getStatus() == JobStatus.QUEUED) {
            job.markRunning(stage);
        } else {
            job.moveToStage(stage);
        }

        generateJobRepository.save(job);
        log.info("[Brickers] ✅ Job Stage 업데이트 완료 | jobId={} | stage={}", jobId, stage);
    }

    /**
     * ✅ Blueprint 서버에서 PDF URL 업데이트
     */
    public void updatePdfUrl(String jobId, String pdfUrl) {
        log.info("[Brickers] PDF URL 업데이트 | jobId={} | pdfUrl={}", jobId, pdfUrl);

        GenerateJobEntity job = generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));

        job.setPdfUrl(pdfUrl);
        job.setUpdatedAt(LocalDateTime.now());
        generateJobRepository.save(job);

        log.info("[Brickers] ✅ PDF URL 저장 완료 | jobId={}", jobId);
    }

    /**
     * ✅ Screenshot 서버에서 screenshotUrls 업데이트
     */
    public void updateScreenshotUrls(String jobId, Map<String, String> screenshotUrls) {
        log.info("[Brickers] Screenshot URLs 업데이트 | jobId={} | views={}", jobId, screenshotUrls.keySet());

        GenerateJobEntity job = generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));

        job.setScreenshotUrls(screenshotUrls);
        job.setUpdatedAt(LocalDateTime.now());
        generateJobRepository.save(job);

        log.info("[Brickers] ✅ Screenshot URLs 저장 완료 | jobId={} | views={}", jobId, screenshotUrls.keySet());
    }

    /**
     * ✅ Gemini 추천 태그 저장 (AI Server에서 호출)
     */
    public void updateSuggestedTags(String jobId, List<String> tags) {
        log.info("[Brickers] Suggested Tags 업데이트 | jobId={} | tags={}", jobId, tags);

        GenerateJobEntity job = generateJobRepository.findById(jobId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + jobId));

        job.setSuggestedTags(tags);
        job.setUpdatedAt(LocalDateTime.now());
        generateJobRepository.save(job);

        log.info("[Brickers] ✅ Suggested Tags 저장 완료 | jobId={} | tags={}", jobId, tags);
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

    /**
     * AI Server에서 에이전트 로그 수신 + SSE 푸시
     */
    public void addAgentLog(String jobId, String step, String message) {
        String logEntry = "[" + step + "] " + message;
        log.debug("[AgentLog] jobId={} | {}", jobId, logEntry);

        // 버퍼에 저장 (최대 크기 제한)
        List<String> buffer = agentLogBuffer.computeIfAbsent(jobId,
                k -> Collections.synchronizedList(new ArrayList<>()));
        synchronized (buffer) {
            buffer.add(logEntry);
            while (buffer.size() > MAX_LOG_BUFFER_SIZE) {
                buffer.remove(0);
            }
        }
        agentLogLastWrite.put(jobId, System.currentTimeMillis());

        // SSE 구독자에게 전송
        List<SseEmitter> emitters = agentLogEmitters.get(jobId);
        if (emitters != null) {
            List<SseEmitter> dead = new ArrayList<>();
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("agent-log")
                            .data(logEntry));
                } catch (IOException e) {
                    dead.add(emitter);
                }
            }
            emitters.removeAll(dead);
        }
    }

    /**
     * 프론트엔드 SSE 구독
     */
    public SseEmitter subscribeAgentLogs(String jobId) {
        SseEmitter emitter = new SseEmitter(1_800_000L); // 30분 타임아웃

        // emitter를 먼저 등록한 후 버퍼 replay (per-job synchronized)
        List<SseEmitter> emitterList = agentLogEmitters.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>());
        List<String> buffer = agentLogBuffer.get(jobId);

        if (buffer != null) {
            synchronized (buffer) {
                emitterList.add(emitter);
                // 기존 로그 전송 (synchronized 블록 안에서 replay)
                for (String logEntry : buffer) {
                    try {
                        emitter.send(SseEmitter.event()
                                .name("agent-log")
                                .data(logEntry));
                    } catch (IOException e) {
                        break;
                    }
                }
            }
        } else {
            emitterList.add(emitter);
        }

        // 응답 헤더 즉시 flush용 초기 이벤트
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException ignored) {
        }

        emitter.onCompletion(() -> removeEmitter(jobId, emitter));
        emitter.onTimeout(() -> removeEmitter(jobId, emitter));
        emitter.onError(e -> removeEmitter(jobId, emitter));

        return emitter;
    }

    private void removeEmitter(String jobId, SseEmitter emitter) {
        List<SseEmitter> emitters = agentLogEmitters.get(jobId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                agentLogEmitters.remove(jobId);
            }
        }
    }

    /**
     * 5분마다 실행: 마지막 로그 추가 후 10분 지난 jobId의 버퍼 삭제
     */
    @Scheduled(fixedRate = 300000)
    public void cleanupStaleAgentLogBuffers() {
        long now = System.currentTimeMillis();
        long staleThreshold = 10 * 60 * 1000L; // 10분

        agentLogLastWrite.forEach((jobId, lastWrite) -> {
            if (now - lastWrite > staleThreshold) {
                agentLogBuffer.remove(jobId);
                agentLogLastWrite.remove(jobId);
                log.debug("[AgentLog] Cleaned up stale buffer for jobId={}", jobId);
            }
        });
    }

    /**
     * ✅ 배경 합성 생성 (AI Server Proxy)
     */
    public Map<String, Object> createBackgroundComposition(org.springframework.web.multipart.MultipartFile file,
            String subject) {
        try {
            return aiRenderClient.generateBackgroundComposite(file, subject);
        } catch (Exception e) {
            log.error("[Brickers] 배경 합성 실패: {}", e.getMessage());
            throw new RuntimeException("배경 합성 실패: " + e.getMessage());
        }
    }
}
