package com.brickers.backend.admin.judge.service;

import com.brickers.backend.admin.judge.dto.JudgeResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@Service
public class AdminJudgeService {

    private final WebClient aiWebClient;

    public AdminJudgeService(WebClient aiWebClient) {
        this.aiWebClient = aiWebClient;
    }

    public JudgeResponse judge(String ldrUrl) {
        log.info("[AdminJudge] Requesting judge for LDR URL: {}", ldrUrl);

        JudgeResponse response = aiWebClient.post()
                .uri("/api/judge-url")
                .bodyValue(Map.of("ldr_url", ldrUrl))
                .retrieve()
                .bodyToMono(JudgeResponse.class)
                .block();

        if (response != null) {
            log.info("[AdminJudge] Judge complete: score={}, bricks={}, issues={}",
                    response.getScore(), response.getBrickCount(),
                    response.getIssues() != null ? response.getIssues().size() : 0);
        }

        return response;
    }
}
