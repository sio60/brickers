package com.brickers.backend.admin.dto;

import com.brickers.backend.gallery.entity.GalleryCommentEntity;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminCommentDto {
    private String id;
    private String postId;
    private String authorId;
    private String authorNickname;
    private String content;
    private boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdminCommentDto from(GalleryCommentEntity entity) {
        return AdminCommentDto.builder()
                .id(entity.getId())
                .postId(entity.getPostId())
                .authorId(entity.getAuthorId())
                .authorNickname(entity.getAuthorNickname())
                .content(entity.getContent())
                .deleted(entity.isDeleted())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
