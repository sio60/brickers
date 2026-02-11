package com.brickers.backend.admin.comment.controller;

import com.brickers.backend.admin.comment.dto.AdminCommentDto;
import com.brickers.backend.admin.comment.service.AdminCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/comments")
@RequiredArgsConstructor
public class AdminCommentController {

    private final AdminCommentService adminCommentService;

    @GetMapping
    public ResponseEntity<Page<AdminCommentDto>> getAllComments(
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(adminCommentService.getAllComments(pageable));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable String commentId) {
        adminCommentService.deleteComment(commentId);
        return ResponseEntity.noContent().build();
    }
}
