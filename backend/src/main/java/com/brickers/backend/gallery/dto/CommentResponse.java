package com.brickers.backend.gallery.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CommentResponse {
    private String id;
    private String postId;
    private String authorId;
    private String authorNickname;
    private String authorProfileImage;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
