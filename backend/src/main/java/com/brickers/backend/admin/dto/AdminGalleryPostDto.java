package com.brickers.backend.admin.dto;

import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.Visibility;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminGalleryPostDto {
    private String id;
    private String title;
    private String content; // Admin might want to see content preview
    private String thumbnailUrl;
    private String authorId;
    private String authorNickname;
    private Visibility visibility;
    private boolean deleted;
    private long viewCount;
    private long likeCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdminGalleryPostDto from(GalleryPostEntity post) {
        return AdminGalleryPostDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .thumbnailUrl(post.getThumbnailUrl())
                .authorId(post.getAuthorId())
                .authorNickname(post.getAuthorNickname())
                .visibility(post.getVisibility())
                .deleted(post.isDeleted())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
}
