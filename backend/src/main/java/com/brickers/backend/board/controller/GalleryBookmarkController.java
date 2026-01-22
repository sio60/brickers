package com.brickers.backend.board.controller;

import com.brickers.backend.board.dto.BookmarkToggleResponse;
import com.brickers.backend.board.dto.MyBookmarkItemResponse;
import com.brickers.backend.board.service.GalleryBookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gallery")
@RequiredArgsConstructor
public class GalleryBookmarkController {

    private final GalleryBookmarkService bookmarkService;

    /** 북마크 토글 (추가/해제) */
    @PostMapping("/{id}/bookmark")
    public BookmarkToggleResponse toggle(@PathVariable("id") String postId,
            OAuth2AuthenticationToken auth) {
        return bookmarkService.toggleBookmark(auth, postId);
    }

    /** 내 북마크 목록 */
    @GetMapping("/bookmarks/my")
    public Page<MyBookmarkItemResponse> myBookmarks(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            OAuth2AuthenticationToken auth) {
        return bookmarkService.listMyBookmarks(auth, page, size);
    }
}
