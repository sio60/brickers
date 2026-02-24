package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.service.KidsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * 🔗 KidsShareController
 * 배경 합성 및 공유 관련 유틸리티 기능을 담당합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/kids/share")
@RequiredArgsConstructor
public class KidsShareController {

    private final KidsService kidsService;

    /**
     * 배경 생성 및 합성 (공유용)
     */
    @PostMapping(value = "/background", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createBackground(
            @RequestParam("file") MultipartFile file,
            @RequestParam("subject") String subject) {
        log.info("📥 [KidsShareController] 배경 합성 요청: subject={}", subject);
        Map<String, Object> result = kidsService.createBackgroundComposition(file, subject);
        return ResponseEntity.ok(result);
    }
}
