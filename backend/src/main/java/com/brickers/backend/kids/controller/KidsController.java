package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.dto.KidsGenerateRequest;
import com.brickers.backend.kids.service.KidsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/kids")
@RequiredArgsConstructor
@Slf4j
public class KidsController {

    private final KidsService kidsService;

    /**
     * 🚀 브릭 생성 요청
     */
    @PostMapping(value = "/generate", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> generateBrick(
            Authentication authentication,
            @RequestBody KidsGenerateRequest request) {
        log.info("[KidsController] 브릭 생성 요청: title={}", request.getTitle());

        String userId = (authentication != null && authentication.getPrincipal() != null)
                ? String.valueOf(authentication.getPrincipal())
                : null;

        Map<String, Object> result = kidsService.startGeneration(
                userId, request.getSourceImageUrl(), request.getAge(),
                request.getBudget(), request.getTitle(),
                request.getPrompt(), request.getLanguage());

        return ResponseEntity.ok(result);
    }
}
