package com.brickers.backend.color.service;

import com.brickers.backend.color.dto.ColorVariantRequest;
import com.brickers.backend.color.dto.ColorVariantResponse;
import com.brickers.backend.color.dto.ThemeInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ColorVariantService {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.ai-server-url:http://localhost:8000}")
    private String aiServerUrl;

    /**
     * 사용 가능한 색상 테마 목록 조회
     */
    public List<ThemeInfo> getThemes() {
        WebClient webClient = webClientBuilder.build();

        try {
            Map<String, Object> response = webClient.get()
                    .uri(aiServerUrl + "/api/v1/color-variant/themes")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("themes")) {
                List<Map<String, String>> themes = (List<Map<String, String>>) response.get("themes");
                return themes.stream()
                        .map(t -> {
                            ThemeInfo info = new ThemeInfo();
                            info.setName(t.get("name"));
                            info.setDescription(t.get("description"));
                            return info;
                        })
                        .toList();
            }
        } catch (Exception e) {
            log.error("[ColorVariant] Failed to get themes: {}", e.getMessage());
        }

        // 폴백: 하드코딩된 테마 목록
        return List.of(
                createTheme("sunset", "노을 테마 - 따뜻한 오렌지, 빨강, 노랑 계열"),
                createTheme("ocean", "바다 테마 - 시원한 파랑, 청록 계열"),
                createTheme("forest", "숲 테마 - 자연의 초록, 갈색 계열"),
                createTheme("night", "밤 테마 - 어두운 보라, 파랑, 검정 계열"),
                createTheme("candy", "캔디 테마 - 밝은 핑크, 민트 계열"),
                createTheme("monochrome", "흑백 테마 - 그레이스케일"),
                createTheme("fire", "불꽃 테마 - 빨강, 주황, 노랑의 그라데이션"),
                createTheme("ice", "얼음 테마 - 차가운 하늘색, 흰색 계열")
        );
    }

    /**
     * LDR 파일에 색상 테마 적용
     */
    public ColorVariantResponse applyColorVariant(ColorVariantRequest request) {
        WebClient webClient = webClientBuilder.build();

        log.info("[ColorVariant] Applying theme '{}' to LDR: {}", request.getTheme(), request.getLdrUrl());

        try {
            ColorVariantResponse response = webClient.post()
                    .uri(aiServerUrl + "/api/v1/color-variant")
                    .bodyValue(Map.of(
                            "ldr_url", request.getLdrUrl(),
                            "theme", request.getTheme()
                    ))
                    .retrieve()
                    .bodyToMono(ColorVariantResponse.class)
                    .block();

            if (response != null) {
                log.info("[ColorVariant] Success: theme={}, changed={} bricks",
                        response.getThemeApplied(), response.getChangedBricks());
            }

            return response;

        } catch (Exception e) {
            log.error("[ColorVariant] Failed: {}", e.getMessage(), e);

            ColorVariantResponse errorResponse = new ColorVariantResponse();
            errorResponse.setOk(false);
            errorResponse.setMessage("색상 변경 실패: " + e.getMessage());
            return errorResponse;
        }
    }

    private ThemeInfo createTheme(String name, String description) {
        ThemeInfo info = new ThemeInfo();
        info.setName(name);
        info.setDescription(description);
        return info;
    }
}
