package com.brickers.backend.gallery.controller;

import com.brickers.backend.gallery.dto.CommentCreateRequest;
import com.brickers.backend.gallery.dto.CommentResponse;
import com.brickers.backend.gallery.service.GalleryCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gallery/{postId}/comments")
@RequiredArgsConstructor
public class GalleryCommentController {

    private final GalleryCommentService commentService;

    /** 댓글 목록 조회 (페이징) */
    @GetMapping
    public Page<CommentResponse> getComments(
            @PathVariable("postId") String postId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return commentService.getComments(postId, page, size);
    }

    /** 댓글 작성 (로그인 필요) */
    @PostMapping
    public CommentResponse createComment(
            @PathVariable("postId") String postId,
            Authentication auth,
            @RequestBody CommentCreateRequest req) {
        return commentService.createComment(auth, postId, req);
    }

    /** 댓글 삭제 (작성자만) */
    @DeleteMapping("/{commentId}")
    public void deleteComment(
            @PathVariable("postId") String postId,
            @PathVariable("commentId") String commentId,
            Authentication auth) {
        commentService.deleteComment(auth, commentId);
    }

    /** 댓글 수 조회 */
    @GetMapping("/count")
    public long getCommentCount(@PathVariable("postId") String postId) {
        return commentService.getCommentCount(postId);
    }
}
