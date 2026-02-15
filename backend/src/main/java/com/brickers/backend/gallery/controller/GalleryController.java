package com.brickers.backend.gallery.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.brickers.backend.gallery.dto.*;
import com.brickers.backend.gallery.service.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gallery")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class GalleryController {

    private final GalleryService galleryService;
    private final GalleryReactionService galleryReactionService;
    private final GalleryViewService galleryViewService;

    @Value("${INTERNAL_API_TOKEN:}")
    private String internalApiToken;

    /** 게시글 생성 (로그인 필요) */
    @PostMapping
    public GalleryResponse create(Authentication auth, @RequestBody GalleryCreateRequest req) {
        return galleryService.create(auth, req);
    }

    /** 인기 태그 목록 */
    @GetMapping("/tags")
    public List<String> tags() {
        return galleryService.getPopularTags();
    }

    /** 공개 게시글 목록 */
    @GetMapping
    public Page<GalleryResponse> listPublic(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "12") int size,
            @RequestParam(name = "sort", defaultValue = "latest") String sort,
            @RequestParam(name = "level", required = false) String level,
            Authentication authOrNull) {
        return galleryService.listPublic(page, size, sort, level, authOrNull);
    }

    /** 🔍 공개 게시글 검색 */
    @GetMapping("/search")
    public Page<GalleryResponse> search(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "tag", required = false) String tag,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "12") int size,
            @RequestParam(name = "sort", defaultValue = "latest") String sort,
            Authentication authOrNull) {
        return galleryService.searchPublic(q, tag, page, size, sort, authOrNull);
    }

    /**
     * 게시글 상세 (PUBLIC은 누구나 / PRIVATE은 작성자만)
     * ✅ 조회수 정책(현재 구현은 세션 기반 24h 1회)
     */
    @GetMapping("/{id}")
    public GalleryResponse detail(
            @PathVariable("id") String id,
            Authentication authOrNull,
            HttpServletRequest request) {
        String viewerKey = galleryViewService.buildViewerKey(authOrNull, request);

        galleryViewService.increaseViewIfNeeded(id, viewerKey);
        return galleryService.getDetail(id, authOrNull);
    }

    /** 게시글 수정 (작성자만) */
    @PatchMapping("/{id}")
    public GalleryResponse update(
            @PathVariable("id") String id,
            Authentication auth,
            @RequestBody GalleryUpdateRequest req) {
        return galleryService.update(id, auth, req);
    }

    /** 게시글 삭제 (작성자만) */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") String id, Authentication auth) {
        galleryService.delete(id, auth);
    }

    /** 내 게시글 목록 */
    @GetMapping("/my")
    public Page<GalleryResponse> my(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "12") int size,
            @RequestParam(name = "sort", defaultValue = "latest") String sort,
            Authentication auth) {
        return galleryService.listMine(auth, page, size, sort);
    }

    /**
     * Screenshot 서버에서 갤러리 포스트의 screenshotUrls 업데이트 (내부 API)
     * Python: PATCH /api/gallery/{id}/screenshots
     */
    @PatchMapping("/{id}/screenshots")
    public ResponseEntity<Void> updateScreenshots(
            @PathVariable("id") String id,
            @RequestHeader("X-Internal-Token") String token,
            @RequestBody Map<String, Object> body) {
        if (internalApiToken == null || internalApiToken.isBlank() || !internalApiToken.equals(token)) {
            log.warn("[GalleryController] 스크린샷 업데이트 토큰 불일치");
            return ResponseEntity.status(403).build();
        }
        @SuppressWarnings("unchecked")
        Map<String, String> urls = (Map<String, String>) body.get("screenshotUrls");
        if (urls == null || urls.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        galleryService.updateScreenshotUrls(id, urls);
        return ResponseEntity.ok().build();
    }

    /** 좋아요/싫어요 토글 */
    @PostMapping("/{id}/reaction")
    public ReactionToggleResponse toggleReaction(
            @PathVariable("id") String id,
            Authentication auth,
            @RequestBody ReactionToggleRequest req) {
        return galleryReactionService.toggle(auth, id, req);
    }
}
