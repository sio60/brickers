package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.dto.KidsGenerateRequest;
import com.brickers.backend.kids.service.KidsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
            @RequestBody Map<String, String> body) {
        String stageName = body.get("stage");
        kidsService.updateJobStage(jobId, stageName);
        return ResponseEntity.ok().build();
    }
}
