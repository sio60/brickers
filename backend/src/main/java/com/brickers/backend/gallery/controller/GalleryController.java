package com.brickers.backend.gallery.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.brickers.backend.gallery.dto.*;
import com.brickers.backend.gallery.service.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/gallery")
@RequiredArgsConstructor
public class GalleryController {

    private final GalleryService galleryService;
    private final GalleryReactionService galleryReactionService;
    private final GalleryViewService galleryViewService;

    /** 게시글 생성 (로그인 필요) */
    @PostMapping
    public GalleryResponse create(Authentication auth, @RequestBody GalleryCreateRequest req) {
        return galleryService.create(auth, req);
    }

    /** 공개 게시글 목록 */
    @GetMapping
    public Page<GalleryResponse> listPublic(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return galleryService.listPublic(page, size);
    }

    /** 🔍 공개 게시글 검색 */
    @GetMapping("/search")
    public Page<GalleryResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return galleryService.searchPublic(q, tag, page, size);
    }

    /**
     * 게시글 상세 (PUBLIC은 누구나 / PRIVATE은 작성자만)
     * ✅ 조회수 정책(현재 구현은 세션 기반 24h 1회)
     */
    @GetMapping("/{id}")
    public GalleryResponse detail(
            @PathVariable String id,
            Authentication authOrNull,
            HttpServletRequest request) {
        String viewerKey = galleryViewService.buildViewerKey(authOrNull, request);

        galleryViewService.increaseViewIfNeeded(id, viewerKey);
        return galleryService.getDetail(id, authOrNull);
    }

    /** 게시글 수정 (작성자만) */
    @PatchMapping("/{id}")
    public GalleryResponse update(
            @PathVariable String id,
            Authentication auth,
            @RequestBody GalleryUpdateRequest req) {
        return galleryService.update(id, auth, req);
    }

    /** 게시글 삭제 (작성자만) */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id, Authentication auth) {
        galleryService.delete(id, auth);
    }

    /** 내 게시글 목록 */
    @GetMapping("/my")
    public Page<GalleryResponse> my(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            Authentication auth) {
        return galleryService.listMine(auth, page, size);
    }

    /** 좋아요/싫어요 토글 */
    @PostMapping("/{id}/reaction")
    public ReactionToggleResponse toggleReaction(
            @PathVariable String id,
            Authentication auth,
            @RequestBody ReactionToggleRequest req) {
        return galleryReactionService.toggle(auth, id, req);
    }
}
