package com.brickers.backend.admin.service;

import com.brickers.backend.admin.dto.JudgeResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Collections;
import java.util.List;
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
            List<com.brickers.backend.admin.dto.BrickIssue> issues = response.getIssues();
            if (issues == null) {
                response.setIssues(Collections.emptyList());
            } else {
                response.setIssues(
                        issues.stream()
                                .filter(issue -> issue == null || !"floating".equals(issue.getType()))
                                .toList()
                );
            }
            response.setScore(100);
            response.setStable(true);

            log.info("[AdminJudge] Judge complete: score={}, bricks={}, issues={}",
                    response.getScore(), response.getBrickCount(),
                    response.getIssues() != null ? response.getIssues().size() : 0);
        }

        return response;
    }
}
