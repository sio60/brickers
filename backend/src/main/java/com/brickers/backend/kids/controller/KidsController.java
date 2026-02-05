package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.dto.AgentLogRequest;
import com.brickers.backend.kids.dto.KidsGenerateRequest;
import com.brickers.backend.kids.service.KidsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/kids")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class KidsController {

    private final KidsService kidsService;

    @PostMapping(value = "/generate", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> generateBrick(
            Authentication authentication,
            @RequestBody KidsGenerateRequest request
    ) {
        log.info("📥 [KidsController] /api/kids/generate 요청 수신");
        log.info("   - sourceImageUrl: {}", request.getSourceImageUrl());
        log.info("   - age: {}, budget: {}, title: {}", request.getAge(), request.getBudget(), request.getTitle());

        String userId = (authentication != null && authentication.getPrincipal() != null)
                ? String.valueOf(authentication.getPrincipal())
                : null;
        log.info("   - userId: {}", userId);

        Map<String, Object> result = kidsService.startGeneration(
                userId,
                request.getSourceImageUrl(),
                request.getAge(),
                request.getBudget(),
                request.getTitle()
        );
        log.info("✅ [KidsController] 응답: {}", result);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<?> getJobStatus(@PathVariable String jobId) {
        return ResponseEntity.ok(kidsService.getJobStatus(jobId));
    }

    /**
     * Job stage 업데이트 (AI Server에서 중간 진행 상황 전송용)
     */
    @PatchMapping("/jobs/{jobId}/stage")
    public ResponseEntity<Void> updateJobStage(
            @PathVariable String jobId,
            @RequestHeader("X-Internal-Token") String token,
            @RequestBody Map<String, String> body
    ) {
        String expected = System.getenv("INTERNAL_API_TOKEN");
        if (expected == null || expected.isBlank() || !expected.equals(token)) {
            return ResponseEntity.status(403).build();
        }
        String stageName = body.get("stage");
        if (stageName == null || stageName.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        kidsService.updateJobStage(jobId, stageName);
        return ResponseEntity.ok().build();
    }

    /**
     * AI Server에서 CoScientist 에이전트 로그 수신
     */
    @PostMapping("/jobs/{jobId}/logs")
    public ResponseEntity<Void> receiveAgentLog(
            @PathVariable String jobId,
            @RequestHeader("X-Internal-Token") String token,
            @Valid @RequestBody AgentLogRequest request
    ) {
        String expected = System.getenv("INTERNAL_API_TOKEN");
        if (expected == null || expected.isBlank() || !expected.equals(token)) {
            return ResponseEntity.status(403).build();
        }
        kidsService.addAgentLog(jobId, request.getStep(), request.getMessage());
        return ResponseEntity.ok().build();
    }

    /**
     * 프론트엔드 SSE 스트리밍 (CoScientist 로그)
     */
    @GetMapping("/jobs/{jobId}/logs/stream")
    public SseEmitter streamAgentLogs(@PathVariable String jobId) {
        return kidsService.subscribeAgentLogs(jobId);
    }
}
