package com.brickers.backend.board.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "gallery_reactions")
@CompoundIndex(name = "ux_user_post", def = "{'userId':1,'postId':1}", unique = true)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryReactionEntity {

    @Id
    private String id;

    private String userId;
    private String postId;

    private ReactionType type; // LIKE / DISLIKE

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
