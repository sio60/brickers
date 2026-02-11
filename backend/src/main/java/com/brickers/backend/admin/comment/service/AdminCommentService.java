package com.brickers.backend.admin.comment.service;

import com.brickers.backend.admin.comment.dto.AdminCommentDto;
import com.brickers.backend.gallery.entity.GalleryCommentEntity;
import com.brickers.backend.gallery.repository.GalleryCommentRepository;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminCommentService {

    private final GalleryCommentRepository commentRepository;
    private final GalleryPostRepository galleryPostRepository;

    @Transactional(readOnly = true)
    public Page<AdminCommentDto> getAllComments(Pageable pageable) {
        return commentRepository.findAll(pageable).map(AdminCommentDto::from);
    }

    @Transactional
    public void deleteComment(String commentId) {
        GalleryCommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        if (!comment.isDeleted()) {
            comment.setDeleted(true);
            comment.setUpdatedAt(LocalDateTime.now());
            commentRepository.save(comment);

            // Update post comment count
            galleryPostRepository.findById(comment.getPostId()).ifPresent(post -> {
                post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
                galleryPostRepository.save(post);
            });
        }
    }
}
