package com.brickers.backend.kids.service;

import com.brickers.backend.job.entity.KidsLevel;
import com.brickers.backend.upload_s3.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 🎨 KidsImageService
 * DALL-E 이미지 생성 및 프롬프트 엔지니어링을 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KidsImageService {

    private final StorageService storageService;
    private final WebClient.Builder webClientBuilder;

    @Value("${APP_OPENAI_API_KEY}")
    private String openaiApiKey;

    /**
     * 프롬프트를 기반으로 이미지를 생성하고 S3에 업로드합니다.
     */
    public String generateAndStoreImage(String userId, String prompt, String age, String title, String language) {
        try {
            log.info("[KidsImageService] 프롬프트로 이미지 생성 시작: {}", prompt);
            byte[] imageBytes = generateImageFromPrompt(prompt, age, title, language);
            String fileName = "dalle_" + UUID.randomUUID() + ".png";

            var stored = storageService.storeFile(userId, fileName, imageBytes, "image/png");
            log.info("[KidsImageService] DALL-E 이미지 S3 업로드 완료: {}", stored.url());
            return stored.url();
        } catch (Exception e) {
            log.error("[KidsImageService] 이미지 생성 실패: {}", e.getMessage());
            throw new RuntimeException("이미지 생성 실패: " + e.getMessage());
        }
    }

    private byte[] generateImageFromPrompt(String prompt, String age, String title, String language) {
        String finalPrompt = buildEnhancedImagePrompt(prompt, age, title, language);

        Map<String, Object> requestBody = Map.of(
                "model", "dall-e-3",
                "prompt", finalPrompt,
                "n", 1,
                "size", "1024x1024",
                "response_format", "b64_json");

        Map<String, Object> response = webClientBuilder.build()
                .mutate()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build()
                .post()
                .uri("https://api.openai.com/v1/images/generations")
                .header("Authorization", "Bearer " + openaiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                })
                .block(Duration.ofSeconds(60));

        if (response == null || !response.containsKey("data")) {
            throw new RuntimeException("OpenAI 응답 없음");
        }

        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        if (data.isEmpty()) {
            throw new RuntimeException("OpenAI 이미지 데이터 없음");
        }

        String b64Json = (String) data.get(0).get("b64_json");
        return java.util.Base64.getDecoder().decode(b64Json);
    }

    private String buildEnhancedImagePrompt(String rawPrompt, String age, String title, String language) {
        String userPrompt = normalizePrompt(rawPrompt);
        KidsLevel level = KidsLevel.fromAge(age);

        String complexityGuide = switch (level) {
            case LEVEL_1 -> "Complexity target: very simple, big chunky shapes, minimal details.";
            case LEVEL_2 -> "Complexity target: simple-to-medium details, clear color separation.";
            case LEVEL_3 -> "Complexity target: medium details with clear structural readability.";
            case PRO -> "Complexity target: richer details allowed, but keep buildable geometry.";
        };

        StringBuilder builder = new StringBuilder();
        builder.append("Create one single concept image for brick model generation. ");
        builder.append("User request: \"").append(userPrompt).append("\". ");

        if (title != null && !title.isBlank()) {
            builder.append("Optional title context: \"").append(normalizePrompt(title)).append("\". ");
        }
        if (language != null && !language.isBlank()) {
            builder.append("Language hint: ").append(language.trim()).append(". ");
        }

        builder.append(complexityGuide).append(" ");
        builder.append("Hard requirements: single subject, centered composition, full object visible, ");
        builder.append("clean light background, natural material cues, clear silhouette, ");
        builder.append("physically buildable and stable structure, no floating impossible parts, ");
        builder.append("prefer simple color blocks over noisy micro details, ");
        builder.append("no text, letters, logos, watermark, UI elements, collage, split layout, ");
        builder.append("and avoid blur or extreme shadows.");

        return builder.toString();
    }

    private String normalizePrompt(String text) {
        if (text == null || text.isBlank())
            return "";
        String normalized = text.replaceAll("\\s+", " ").trim();
        return normalized.length() > 300 ? normalized.substring(0, 300) : normalized;
    }
}
