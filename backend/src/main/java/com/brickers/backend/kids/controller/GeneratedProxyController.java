package com.brickers.backend.kids.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

@RestController
@RequestMapping("/api/generated")
@RequiredArgsConstructor
@Slf4j
public class GeneratedProxyController {

    private final WebClient aiWebClient;

    @Value("${AI_SERVER_URL}")
    private String aiServerUrl;

    /**
     * AI 서버의 로컬 파일(generated)을 프록시하여 제공
     * 예: /api/generated/req_123/corrected.png ->
     * AI_SERVER_URL/api/generated/req_123/corrected.png
     */
    @GetMapping("/**")
    public ResponseEntity<Resource> proxyGeneratedFile(HttpServletRequest request) {
        // Request URL로부터 /api/generated 이후 경로 추출
        String requestUri = request.getRequestURI();
        String path = requestUri.replace("/api/generated", "");

        // AI 서버 요청 URL 구성 (/api/generated + path)
        // AI 서버 URL이 /api/generated를 포함하지 않는다고 가정하고 전체 경로 구성
        String targetUrl = "/api/generated" + path;

        log.info("🔄 [Proxy] Attempting to proxy: {}", targetUrl);

        try {
            // WebClient를 사용하여 AI 서버로부터 파일 다운로드 (동기 처리)
            ResponseEntity<byte[]> response = aiWebClient.get()
                    .uri(targetUrl)
                    .retrieve()
                    .toEntity(byte[].class)
                    .block(); // Blocking for MVC

            if (response == null || response.getBody() == null) {
                log.warn("❌ [Proxy] AI Server returned empty body for: {}", targetUrl);
                return ResponseEntity.notFound().build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.putAll(response.getHeaders());

            // Content-Length 재설정
            headers.setContentLength(response.getBody().length);

            ByteArrayResource resource = new ByteArrayResource(response.getBody());

            log.info("✅ [Proxy] Success: {} bytes", response.getBody().length);

            return ResponseEntity.status(response.getStatusCode())
                    .headers(headers)
                    .body(resource);

        } catch (Exception e) {
            log.error("❌ [Proxy] Failed to fetch from AI Server ({}): {}", targetUrl, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
