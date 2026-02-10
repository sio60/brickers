package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.dto.AgentLogRequest;
import com.brickers.backend.kids.dto.KidsGenerateRequest;
import com.brickers.backend.kids.service.KidsService;

import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${INTERNAL_API_TOKEN:}")
    private String internalApiToken;

    @PostConstruct
    public void init() {
        if (internalApiToken != null && !internalApiToken.isBlank()) {
            log.info("🔑 [KidsController] Internal Token Loaded: {}... (Length: {})",
                    internalApiToken.length() > 6 ? internalApiToken.substring(0, 6) : internalApiToken,
                    internalApiToken.length());
        } else {
            log.error("❌ [KidsController] Internal Token is MISSING or EMPTY! Check .env file.");
        }
    }

    @PostMapping(value = "/generate", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> generateBrick(
            Authentication authentication,
            @RequestBody KidsGenerateRequest request) {
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
                request.getTitle());
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
            @RequestBody Map<String, String> body) {
        if (internalApiToken.isBlank() || !internalApiToken.equals(token)) {
            log.warn("[KidsController] 토큰 불일치: expected={}, received={}", internalApiToken, token);
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
            @Valid @RequestBody AgentLogRequest request) {
        if (internalApiToken.isBlank() || !internalApiToken.equals(token)) {
            log.warn("[KidsController] 로그 수신 토큰 불일치");
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

    /**
     * Blueprint 서버에서 PDF 생성 완료 시 pdfUrl 업데이트
     * Python: PATCH /api/kids/jobs/{jobId}/pdf
     */
    @PatchMapping("/jobs/{jobId}/pdf")
    public ResponseEntity<Void> updatePdfUrl(
            @PathVariable String jobId,
            @RequestHeader("X-Internal-Token") String token,
            @RequestBody Map<String, String> body) {
        if (internalApiToken.isBlank() || !internalApiToken.equals(token)) {
            log.warn("[KidsController] PDF 업데이트 토큰 불일치");
            return ResponseEntity.status(403).build();
        }
        String pdfUrl = body.get("pdfUrl");
        if (pdfUrl == null || pdfUrl.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        kidsService.updatePdfUrl(jobId, pdfUrl);
        return ResponseEntity.ok().build();
    }

    /**
     * Screenshot 서버에서 6면 스크린샷 완료 시 screenshotUrls 업데이트
     * Python: PATCH /api/kids/jobs/{jobId}/screenshots
     */
    @PatchMapping("/jobs/{jobId}/screenshots")
    public ResponseEntity<Void> updateScreenshots(
            @PathVariable String jobId,
            @RequestHeader("X-Internal-Token") String token,
            @RequestBody Map<String, Object> body) {
        if (internalApiToken.isBlank() || !internalApiToken.equals(token)) {
            log.warn("[KidsController] 스크린샷 업데이트 토큰 불일치");
            return ResponseEntity.status(403).build();
        }
        @SuppressWarnings("unchecked")
        java.util.Map<String, String> urls = (java.util.Map<String, String>) body.get("screenshotUrls");
        if (urls == null || urls.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        kidsService.updateScreenshotUrls(jobId, urls);
        return ResponseEntity.ok().build();
    }

    /**
     * ✅ AI Server에서 Gemini 추천 태그 저장
     * Python: PATCH /api/kids/jobs/{jobId}/suggested-tags
     */
    @PatchMapping("/jobs/{jobId}/suggested-tags")
    public ResponseEntity<Void> updateSuggestedTags(
            @PathVariable String jobId,
            @RequestHeader("X-Internal-Token") String token,
            @RequestBody Map<String, Object> body) {
        if (internalApiToken.isBlank() || !internalApiToken.equals(token)) {
            log.warn("[KidsController] 태그 업데이트 토큰 불일치");
            return ResponseEntity.status(403).build();
        }
        @SuppressWarnings("unchecked")
        java.util.List<String> tags = (java.util.List<String>) body.get("suggestedTags");
        if (tags == null || tags.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        kidsService.updateSuggestedTags(jobId, tags);
        return ResponseEntity.ok().build();
    }
}
