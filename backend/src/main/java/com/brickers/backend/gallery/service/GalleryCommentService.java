package com.brickers.backend.gallery.service;

import com.brickers.backend.gallery.dto.CommentCreateRequest;
import com.brickers.backend.gallery.dto.CommentResponse;
import com.brickers.backend.gallery.entity.GalleryCommentEntity;
import com.brickers.backend.gallery.repository.GalleryCommentRepository;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
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
    private final GalleryPostRepository galleryPostRepository;
    private final UserRepository userRepository;

    public Page<CommentResponse> getComments(String postId, int page, int size) {
        // 1. Fetch all comments for the post
        java.util.List<GalleryCommentEntity> allComments = commentRepository.findByPostIdAndDeletedFalse(postId);

        // 2. Filter root comments (parentId is null or empty)
        java.util.List<GalleryCommentEntity> rootComments = allComments.stream()
                .filter(c -> c.getParentId() == null || c.getParentId().isBlank())
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(java.util.stream.Collectors.toList());

        // 3. Pagination in memory
        int start = Math.min(page * size, rootComments.size());
        int end = Math.min((page + 1) * size, rootComments.size());
        java.util.List<GalleryCommentEntity> pagedRoots = rootComments.subList(start, end);

        // 4. Map to response with children
        java.util.List<CommentResponse> content = pagedRoots.stream()
                .map(root -> toResponseWithChildren(root, allComments))
                .collect(java.util.stream.Collectors.toList());

        return new org.springframework.data.domain.PageImpl<>(content, PageRequest.of(page, size), rootComments.size());
    }

    private CommentResponse toResponseWithChildren(GalleryCommentEntity root,
            java.util.List<GalleryCommentEntity> allComments) {
        CommentResponse response = toResponse(root);

        // Filter children (replies) for this current comment
        java.util.List<CommentResponse> children = allComments.stream()
                .filter(c -> root.getId() != null && root.getId().equals(c.getParentId()))
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .map(child -> toResponseWithChildren(child, allComments)) // Recursive call for nested replies
                .collect(java.util.stream.Collectors.toList());

        response.setChildren(children);
        return response;
    }

    public CommentResponse createComment(Authentication auth, String postId, CommentCreateRequest req) {
        String userId = auth.getName();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // Validate parent if provided
        if (req.getParentId() != null) {
            boolean parentExists = commentRepository.existsById(req.getParentId());
            if (!parentExists) {
                throw new IllegalArgumentException("부모 댓글이 존재하지 않습니다.");
            }
        }

        GalleryCommentEntity comment = GalleryCommentEntity.builder()
                .postId(postId)
                .authorId(userId)
                .parentId((req.getParentId() == null || req.getParentId().isBlank()) ? null : req.getParentId().trim())
                .authorNickname(user.getNickname())
                .authorProfileImage(user.getProfileImage())
                .content(req.getContent())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        GalleryCommentEntity saved = commentRepository.save(comment);

        // Update post comment count
        galleryPostRepository.findById(postId).ifPresent(post -> {
            post.setCommentCount(post.getCommentCount() + 1);
            galleryPostRepository.save(post);
        });

        return toResponse(saved);
    }

    public void deleteComment(Authentication auth, String commentId) {
        String userId = auth.getName();
        GalleryCommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!comment.getAuthorId().equals(userId) && !isAdmin) {
            throw new SecurityException("본인의 댓글만 삭제할 수 있습니다.");
        }

        comment.setDeleted(true);
        comment.setUpdatedAt(LocalDateTime.now());
        commentRepository.save(comment);

        // Update post comment count
        galleryPostRepository.findById(comment.getPostId()).ifPresent(post -> {
            post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
            galleryPostRepository.save(post);
        });
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
                .parentId(entity.getParentId()) // Map parentId
                .children(new java.util.ArrayList<>()) // Initialize empty children
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
