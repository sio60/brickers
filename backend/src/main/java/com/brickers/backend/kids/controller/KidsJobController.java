package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.service.KidsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 📊 KidsJobController
 * 작업 상태 조회, SSE 로그 스트리밍, 에이전트 트레이스 조회를 담당합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/kids/jobs")
@RequiredArgsConstructor
public class KidsJobController {

    private final KidsService kidsService;

    /**
     * Job 상태 조회
     */
    @GetMapping("/{jobId}")
    public ResponseEntity<?> getJobStatus(@PathVariable String jobId) {
        return ResponseEntity.ok(kidsService.getJobStatus(jobId));
    }

    /**
     * 프론트엔드 SSE 스트리밍 (AI 에이전트 로그)
     */
    @GetMapping(value = "/{jobId}/logs/stream", produces = "text/event-stream;charset=UTF-8")
    public SseEmitter streamAgentLogs(@PathVariable String jobId) {
        return kidsService.subscribeAgentLogs(jobId);
    }

    /**
     * 에이전트 트레이스 조회 (Admin/디버깅용)
     */
    @GetMapping("/{jobId}/traces")
    public ResponseEntity<?> getAgentTraces(@PathVariable String jobId) {
        return ResponseEntity.ok(kidsService.getAgentTraces(jobId));
    }
}
