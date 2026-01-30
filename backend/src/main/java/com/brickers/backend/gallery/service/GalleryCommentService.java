package com.brickers.backend.gallery.service;

import com.brickers.backend.gallery.dto.CommentCreateRequest;
import com.brickers.backend.gallery.dto.CommentResponse;
import com.brickers.backend.gallery.entity.GalleryCommentEntity;
import com.brickers.backend.gallery.repository.GalleryCommentRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class GalleryCommentService {

    private final GalleryCommentRepository commentRepository;
    private final UserRepository userRepository;

    public Page<CommentResponse> getComments(String postId, int page, int size) {
        Page<GalleryCommentEntity> comments = commentRepository
                .findByPostIdAndDeletedFalseOrderByCreatedAtDesc(postId, PageRequest.of(page, size));
        return comments.map(this::toResponse);
    }

    public CommentResponse createComment(Authentication auth, String postId, CommentCreateRequest req) {
        String userId = auth.getName();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        GalleryCommentEntity comment = GalleryCommentEntity.builder()
                .postId(postId)
                .authorId(userId)
                .authorNickname(user.getNickname())
                .authorProfileImage(user.getProfileImage())
                .content(req.getContent())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        GalleryCommentEntity saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    public void deleteComment(Authentication auth, String commentId) {
        String userId = auth.getName();
        GalleryCommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        if (!comment.getAuthorId().equals(userId)) {
            throw new SecurityException("본인의 댓글만 삭제할 수 있습니다.");
        }

        comment.setDeleted(true);
        comment.setUpdatedAt(LocalDateTime.now());
        commentRepository.save(comment);
    }

    public long getCommentCount(String postId) {
        return commentRepository.countByPostIdAndDeletedFalse(postId);
    }

    private CommentResponse toResponse(GalleryCommentEntity entity) {
        return CommentResponse.builder()
                .id(entity.getId())
                .postId(entity.getPostId())
                .authorId(entity.getAuthorId())
                .authorNickname(entity.getAuthorNickname())
                .authorProfileImage(entity.getAuthorProfileImage())
                .content(entity.getContent())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
