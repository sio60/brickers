package com.brickers.backend.gallery.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.brickers.backend.gallery.dto.BookmarkToggleResponse;
import com.brickers.backend.gallery.dto.MyBookmarkItemResponse;
import com.brickers.backend.gallery.service.GalleryBookmarkService;

@RestController
@RequestMapping("/api/gallery")
@RequiredArgsConstructor
public class GalleryBookmarkController {

    private final GalleryBookmarkService bookmarkService;

    /** 북마크 토글 (추가/해제) */
    @PostMapping("/{id}/bookmark")
    public BookmarkToggleResponse toggle(
            @PathVariable("id") String postId,
            Authentication auth) {
        return bookmarkService.toggleBookmark(auth, postId);
    }

    /** 내 북마크 목록 */
    @GetMapping("/bookmarks/my")
    public Page<MyBookmarkItemResponse> myBookmarks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            Authentication auth) {
        return bookmarkService.listMyBookmarks(auth, page, size);
    }
}
