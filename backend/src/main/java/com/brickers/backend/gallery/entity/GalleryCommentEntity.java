package com.brickers.backend.gallery.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "gallery_comments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryCommentEntity {

    @Id
    private String id;

    @Indexed
    private String postId;

    @Indexed
    private String authorId;

    @Indexed
    private String parentId; // For nested comments

    private String authorNickname;
    private String authorProfileImage;

    private String content;

    @Builder.Default
    private boolean deleted = false;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
