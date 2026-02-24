package com.brickers.backend.kids.controller;

import com.brickers.backend.auth.service.InternalAuthService;
import com.brickers.backend.kids.dto.AgentLogRequest;
import com.brickers.backend.kids.service.KidsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 🔒 InternalKidsController
 * 외부 서버(AI Server, Blueprint Server, Screenshot Server)의 콜백 및 상태 업데이트를 담당합니다.
 * 내부 토큰(X-Internal-Token)으로 보안이 강화되어 있습니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/kids/jobs")
@RequiredArgsConstructor
public class InternalKidsController {

    private final KidsService kidsService;
    private final InternalAuthService authService;

    /**
     * Job 단계(Stage) 업데이트 (AI Server)
     */
    @PatchMapping("/{jobId}/stage")
    public ResponseEntity<Void> updateJobStage(
            @PathVariable String jobId,
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestBody Map<String, String> body) {

        if (!authService.isAdminOrInternal(token))
            return ResponseEntity.status(403).build();

        String stage = body.get("stage");
        if (stage == null || stage.isBlank())
            return ResponseEntity.badRequest().build();

        kidsService.updateJobStage(jobId, stage);
        return ResponseEntity.ok().build();
    }

    /**
     * 에이전트 실시간 로그/트레이스 수신 (AI Server)
     */
    @PostMapping("/{jobId}/logs")
    public ResponseEntity<Void> receiveAgentLog(
            @PathVariable String jobId,
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @Valid @RequestBody AgentLogRequest request) {

        if (!authService.isAdminOrInternal(token))
            return ResponseEntity.status(403).build();

        kidsService.saveAgentTrace(jobId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * PDF URL 업데이트 (Blueprint Server)
     */
    @PatchMapping("/{jobId}/pdf")
    public ResponseEntity<Void> updatePdfUrl(
            @PathVariable String jobId,
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestBody Map<String, String> body) {

        if (!authService.isAdminOrInternal(token))
            return ResponseEntity.status(403).build();

        String pdfUrl = body.get("pdfUrl");
        if (pdfUrl == null || pdfUrl.isBlank())
            return ResponseEntity.badRequest().build();

        kidsService.updatePdfUrl(jobId, pdfUrl);
        return ResponseEntity.ok().build();
    }

    /**
     * 배경 이미지 URL 업데이트 (Screenshot Server)
     */
    @PatchMapping("/{jobId}/background")
    public ResponseEntity<Void> updateBackgroundUrl(
            @PathVariable String jobId,
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestBody Map<String, String> body) {

        if (!authService.isAdminOrInternal(token))
            return ResponseEntity.status(403).build();

        String url = body.get("backgroundUrl");
        if (url == null || url.isBlank())
            return ResponseEntity.badRequest().build();

        kidsService.updateBackgroundUrl(jobId, url);
        return ResponseEntity.ok().build();
    }

    /**
     * 6면 스크린샷 URL 업데이트 (Screenshot Server)
     */
    @PatchMapping("/{jobId}/screenshots")
    public ResponseEntity<Void> updateScreenshots(
            @PathVariable String jobId,
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestBody Map<String, Object> body) {

        if (!authService.isAdminOrInternal(token))
            return ResponseEntity.status(403).build();

        @SuppressWarnings("unchecked")
        Map<String, String> urls = (Map<String, String>) body.get("screenshotUrls");
        if (urls == null || urls.isEmpty())
            return ResponseEntity.badRequest().build();

        kidsService.updateScreenshotUrls(jobId, urls);
        return ResponseEntity.ok().build();
    }

    /**
     * Gemini 추천 태그 업데이트 (AI Server)
     */
    @PatchMapping("/{jobId}/suggested-tags")
    public ResponseEntity<Void> updateSuggestedTags(
            @PathVariable String jobId,
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestBody Map<String, Object> body) {

        if (!authService.isAdminOrInternal(token))
            return ResponseEntity.status(403).build();

        @SuppressWarnings("unchecked")
        java.util.List<String> tags = (java.util.List<String>) body.get("suggestedTags");
        if (tags == null || tags.isEmpty())
            return ResponseEntity.badRequest().build();

        kidsService.updateSuggestedTags(jobId, tags);
        return ResponseEntity.ok().build();
    }

    /**
     * Gemini 이미지 카테고리 업데이트 (AI Server)
     */
    @PatchMapping("/{jobId}/category")
    public ResponseEntity<Void> updateJobCategory(
            @PathVariable String jobId,
            @RequestHeader(name = "X-Internal-Token", required = false) String token,
            @RequestBody Map<String, String> body) {

        if (!authService.isAdminOrInternal(token))
            return ResponseEntity.status(403).build();

        String category = body.get("category");
        if (category == null || category.isBlank())
            return ResponseEntity.badRequest().build();

        kidsService.updateJobCategory(jobId, category);
        return ResponseEntity.ok().build();
    }
}
