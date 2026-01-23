package com.brickers.backend.gallery.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "gallery_bookmarks")
@CompoundIndexes({
        // ✅ 유저가 같은 글을 중복 북마크 방지
        @CompoundIndex(name = "ux_user_post", def = "{'userId': 1, 'postId': 1}", unique = true),
        // ✅ 내 북마크 목록 페이징 정렬 최적화
        @CompoundIndex(name = "ix_user_createdAt", def = "{'userId': 1, 'createdAt': -1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryBookmarkEntity {

    @Id
    private String id;

    private String userId;
    private String postId;

    private LocalDateTime createdAt;
}
