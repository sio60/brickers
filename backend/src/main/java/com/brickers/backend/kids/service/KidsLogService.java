package com.brickers.backend.kids.service;

import com.brickers.backend.kids.dto.AgentLogRequest;
import com.brickers.backend.kids.entity.AgentTrace;
import com.brickers.backend.kids.repository.AgentTraceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 📝 KidsLogService
 * 에이전트 로그 스트리밍(SSE), 트레이스 저장 및 로그 버퍼 관리를 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KidsLogService {

    private final AgentTraceRepository agentTraceRepository;

    private static final int MAX_LOG_BUFFER_SIZE = 100;
    private final ConcurrentHashMap<String, List<String>> agentLogBuffer = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<SseEmitter>> agentLogEmitters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> agentLogLastWrite = new ConcurrentHashMap<>();

    /**
     * 에이전트 트레이스 저장 및 SSE 전송
     */
    public void saveAgentTrace(String jobId, AgentLogRequest request) {
        AgentTrace trace = AgentTrace.builder()
                .jobId(jobId)
                .step(request.getStep())
                .nodeName(request.getNodeName())
                .status(request.getStatus())
                .input(request.getInput())
                .output(request.getOutput())
                .durationMs(request.getDurationMs())
                .message(request.getMessage())
                .createdAt(LocalDateTime.now())
                .build();

        try {
            agentTraceRepository.save(trace);
        } catch (Exception e) {
            log.error("[AgentTrace] DB 저장 실패: {}", e.getMessage());
        }

        if (!"TRACE".equals(request.getStep())) {
            addAgentLog(jobId, request.getStep(), request.getMessage());
        }
    }

    /**
     * 로그 버퍼링 및 SSE 푸시
     */
    public void addAgentLog(String jobId, String step, String message) {
        String logEntry = "[" + step + "] " + message;
        log.debug("[AgentLog] jobId={} | {}", jobId, logEntry);

        List<String> buffer = agentLogBuffer.computeIfAbsent(jobId,
                k -> Collections.synchronizedList(new ArrayList<>()));
        synchronized (buffer) {
            buffer.add(logEntry);
            while (buffer.size() > MAX_LOG_BUFFER_SIZE) {
                buffer.remove(0);
            }
        }
        agentLogLastWrite.put(jobId, System.currentTimeMillis());

        List<SseEmitter> emitters = agentLogEmitters.get(jobId);
        if (emitters != null) {
            List<SseEmitter> dead = new ArrayList<>();
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("agent-log")
                            .data(logEntry, new MediaType("text", "plain", StandardCharsets.UTF_8)));
                } catch (IOException e) {
                    dead.add(emitter);
                }
            }
            emitters.removeAll(dead);
        }
    }

    /**
     * SSE 구독
     */
    public SseEmitter subscribeAgentLogs(String jobId) {
        SseEmitter emitter = new SseEmitter(1_800_000L); // 30분 타임아웃

        List<SseEmitter> emitterList = agentLogEmitters.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>());
        List<String> buffer = agentLogBuffer.get(jobId);

        if (buffer != null) {
            synchronized (buffer) {
                emitterList.add(emitter);
                for (String logEntry : buffer) {
                    try {
                        emitter.send(SseEmitter.event()
                                .name("agent-log")
                                .data(logEntry, new MediaType("text", "plain", StandardCharsets.UTF_8)));
                    } catch (IOException e) {
                        break;
                    }
                }
            }
        } else {
            emitterList.add(emitter);
        }

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
     * 오래된 로그 버퍼 정리 (5분마다)
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

    public List<AgentTrace> getAgentTraces(String jobId) {
        return agentTraceRepository.findByJobIdOrderByCreatedAtAsc(jobId);
    }
}
