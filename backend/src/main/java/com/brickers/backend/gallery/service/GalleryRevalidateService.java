package com.brickers.backend.gallery.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * Next.js Gallery App의 ISR 캐시를 즉시 갱신하는 서비스.
 * 게시글 생성/수정/삭제 시 호출하여 SEO 페이지를 즉시 업데이트한다.
 */
@Slf4j
@Service
public class GalleryRevalidateService {

    private final WebClient webClient;
    private final String revalidateUrl;
    private final String revalidateSecret;
    private final boolean enabled;

    public GalleryRevalidateService(
            WebClient.Builder webClientBuilder,
            @Value("${gallery.revalidate.url:}") String revalidateUrl,
            @Value("${gallery.revalidate.secret:}") String revalidateSecret,
            @Value("${gallery.revalidate.enabled:false}") boolean enabled) {
        this.webClient = webClientBuilder.build();
        this.revalidateUrl = revalidateUrl;
        this.revalidateSecret = revalidateSecret;
        this.enabled = enabled;
    }

    /**
     * 게시글 생성 시 호출
     */
    public void onPostCreated(String postId, String title) {
        revalidate("create", postId, title);
    }

    /**
     * 게시글 수정 시 호출
     */
    public void onPostUpdated(String postId, String title) {
        revalidate("update", postId, title);
    }

    /**
     * 게시글 삭제 시 호출
     */
    public void onPostDeleted(String postId, String title) {
        revalidate("delete", postId, title);
    }

    /**
     * 닉네임 변경 시 호출
     */
    public void onNicknameChanged() {
        revalidate("update", null, null);
    }

    private void revalidate(String type, String postId, String title) {
        if (!enabled || revalidateUrl == null || revalidateUrl.isBlank()) {
            log.debug("[Revalidate] Disabled or URL not configured. type={}, postId={}", type, postId);
            return;
        }

        // Generate slug (must match Next.js logic)
        String slug = null;
        if (title != null && postId != null) {
            String safeTitle = title.replaceAll("\\s+", "-")
                    .replaceAll("[^\\w\\-가-힣]", "");
            slug = safeTitle + "-" + postId;
        }

        Map<String, Object> body = Map.of(
                "type", type,
                "id", postId != null ? postId : "",
                "slug", slug != null ? slug : "");

        // 비동기로 호출 (응답 기다리지 않음)
        webClient.post()
                .uri(revalidateUrl)
                .header("Authorization", "Bearer " + revalidateSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .subscribe(
                        response -> log.info("[Revalidate] Success. type={}, postId={}, response={}", type, postId,
                                response),
                        error -> log.warn("[Revalidate] Failed. type={}, postId={}, error={}", type, postId,
                                error.getMessage()));
    }
}
