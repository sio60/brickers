package com.brickers.backend.kids.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KidsService {

    private final WebClient aiWebClient; // 아까 Config에서 만든 그 친구

    public Map<String, Object> generateBrick(MultipartFile file, String age, int budget) {
        log.info("AI 생성 요청 시작: Age={}, Budget={}", age, budget);

        // 1. Python 서버로 보낼 데이터 포장 (Multipart)
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", file.getResource()); // 파일 자체를 스트림으로 넘김
        builder.part("age", age);
        builder.part("budget", budget);

        try {
            // 2. Python 서버의 /api/v1/kids/process-all 호출
            Map<String, Object> response = aiWebClient.post()
                    .uri("/api/v1/kids/process-all")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(300)) // 
                    .block(); // 결과가 올 때까지 기다림 (동기)

            log.info("AI 생성 완료: {}", response);
            return response;

        } catch (Exception e) {
            log.error("AI 서버 통신 실패", e);
            throw new RuntimeException("AI 서버가 응답하지 않습니다: " + e.getMessage());
        }
    }
}