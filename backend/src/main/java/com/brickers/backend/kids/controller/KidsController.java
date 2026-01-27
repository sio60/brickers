package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.service.KidsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/kids")
@RequiredArgsConstructor
public class KidsController {

    private final KidsService kidsService;

    // React에서 axios.post('/api/kids/generate', formData) 로 호출
    @PostMapping(value = "/generate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> generateBrick(
            Authentication authentication,
            @RequestPart("file") MultipartFile file,
            @RequestParam("age") String age,
            @RequestParam("budget") int budget) {
        // 로그인 시 userId 추출, 비로그인 시 null
        String userId = (authentication != null && authentication.getPrincipal() != null)
                ? String.valueOf(authentication.getPrincipal())
                : null;

        // 서비스에게 일 시키기 (Async 시작)
        Map<String, Object> result = kidsService.startGeneration(userId, file, age, budget);
        return ResponseEntity.ok(result);
    }

    // Polling용 상태 조회
    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<?> getJobStatus(@PathVariable String jobId) {
        // 간단 조회 로직은 서비스나 리포지토리 바로 호출
        // (원칙적으로 Service 거치는 게 좋으나 편의상 Repository 사용 고려, 여기서는 Service에 메소드 추가 권장)
        // -> KidsService에 getJobStatus 추가 후 호출
        return ResponseEntity.ok(kidsService.getJobStatus(jobId));
    }
}