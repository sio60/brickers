package com.brickers.backend.board.controller;

import com.brickers.backend.board.dto.*;
import com.brickers.backend.board.service.GalleryBookmarkService;
import com.brickers.backend.board.service.GalleryReactionService;
import com.brickers.backend.board.service.GalleryService;
import com.brickers.backend.board.service.GalleryViewService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/gallery")
@RequiredArgsConstructor
public class GalleryController {

    private final GalleryService galleryService;

    // ✅ 북마크
    private final GalleryBookmarkService galleryBookmarkService;

    // ✅ 좋아요/싫어요
    private final GalleryReactionService galleryReactionService;

    // ✅ 조회수
    private final GalleryViewService galleryViewService;

    /** 게시글 생성 (로그인 필요) */
    @PostMapping
    public GalleryResponse create(
            OAuth2AuthenticationToken auth,
            @RequestBody GalleryCreateRequest req) {
        return galleryService.create(auth, req);
    }

    /** 공개 게시글 목록 */
    @GetMapping
    public Page<GalleryResponse> listPublic(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return galleryService.listPublic(page, size);
    }

    /** 🔍 공개 게시글 검색 (제목/내용 또는 태그) */
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
     * ✅ 조회수 정책: 세션 기준으로 "같은 게시글은 24시간에 1번만 증가"
     */
    @GetMapping("/{id}")
    public GalleryResponse detail(
            @PathVariable String id,
            OAuth2AuthenticationToken auth,
            HttpSession session) {

        @SuppressWarnings("unchecked")
        Map<String, LocalDateTime> viewMap = (Map<String, LocalDateTime>) session.getAttribute("GALLERY_VIEW_MAP");

        if (viewMap == null) {
            viewMap = new HashMap<>();
            session.setAttribute("GALLERY_VIEW_MAP", viewMap);
        }

        galleryViewService.increaseViewIfNeeded(id, viewMap);

        return galleryService.getDetail(id, auth);
    }

    /** 게시글 수정 (작성자만) */
    @PatchMapping("/{id}")
    public GalleryResponse update(
            @PathVariable String id,
            OAuth2AuthenticationToken auth,
            @RequestBody GalleryUpdateRequest req) {
        return galleryService.update(id, auth, req);
    }

    /** 게시글 삭제 (소프트 삭제, 작성자만) */
    @DeleteMapping("/{id}")
    public void delete(
            @PathVariable String id,
            OAuth2AuthenticationToken auth) {
        galleryService.delete(id, auth);
    }

    /** 내 게시글 목록 (PUBLIC + PRIVATE) */
    @GetMapping("/my")
    public Page<GalleryResponse> my(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            OAuth2AuthenticationToken auth) {
        return galleryService.listMine(auth, page, size);
    }
    // =====================================================
    // ✅ 좋아요/싫어요 API
    // =====================================================

    /** POST /api/gallery/{id}/reaction : 좋아요/싫어요 토글 (LIKE/DISLIKE) */
    @PostMapping("/{id}/reaction")
    public ReactionToggleResponse toggleReaction(
            @PathVariable String id,
            OAuth2AuthenticationToken auth,
            @RequestBody ReactionToggleRequest req) {
        return galleryReactionService.toggle(auth, id, req);
    }
}
