package com.brickers.backend.gallery.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "gallery_posts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryPostEntity {

    @Id
    private String id;

    @Indexed
    private String authorId;

    private String authorNickname;
    private String authorProfileImage;

    private String title;
    private String content;
    private List<String> tags;

    // 업로드 없이 URL만 받는 단계
    private String thumbnailUrl;

    @Builder.Default
    private Visibility visibility = Visibility.PUBLIC;

    @Builder.Default
    private boolean deleted = false;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private long likeCount = 0;

    @Builder.Default
    private long dislikeCount = 0;

    @Builder.Default
    private long viewCount = 0;
}
