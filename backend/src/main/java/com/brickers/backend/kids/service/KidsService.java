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
    private final UserRepository userRepository;
    private final SqsProducerService sqsProducerService;

    // === CoScientist Agent Log Streaming ===
    private static final int MAX_LOG_BUFFER_SIZE = 100;
    private final ConcurrentHashMap<String, List<String>> agentLogBuffer = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<SseEmitter>> agentLogEmitters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> agentLogLastWrite = new ConcurrentHashMap<>();

    @Value("${aws.sqs.enabled:false}")
    private boolean sqsEnabled;

    public Map<String, Object> startGeneration(String userId, String sourceImageUrl, String age, int budget,
            String title) {
        log.info("AI 생성 요청 접수: userId={}, sourceImageUrl={}, age={}, budget={}, title={}",
                safe(userId), sourceImageUrl, safe(age), budget, safe(title));

        if (sourceImageUrl == null || sourceImageUrl.isBlank()) {
            throw new IllegalArgumentException("sourceImageUrl is required");
        }

        // 1) Job 생성/저장
        GenerateJobEntity job = GenerateJobEntity.builder()
                .userId(userId) // null 허용
                .level(ageToKidsLevel(age))
                .status(JobStatus.QUEUED)
                .stage(JobStage.THREE_D_PREVIEW)
                .sourceImageUrl(sourceImageUrl) // Frontend가 업로드한 S3 URL
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
                    sourceImageUrl,
                    age,
                    budget);
        } else {
            // ⚠️ 기존 방식 (직접 호출) - 개발/테스트용
            log.info("[Brickers] 직접 호출 모드 (SQS 비활성화) | jobId={}", job.getId());
            // kidsAsyncWorker는 제거됨 (SQS 전환)
            throw new UnsupportedOperationException("SQS 모드를 활성화해주세요");
        }

        // 3) 즉시 응답
        return Map.of("jobId", job.getId(), "status", JobStatus.QUEUED);
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
}
