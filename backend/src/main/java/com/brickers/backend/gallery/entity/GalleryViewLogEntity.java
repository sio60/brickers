package com.brickers.backend.gallery.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "gallery_view_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndex(name = "uk_post_viewer", def = "{'postId': 1, 'viewerKey': 1}", unique = true)
public class GalleryViewLogEntity {

    @Id
    private String id;

    private String postId;

    /**
     * ✅ viewer 식별 키
     * - 로그인: USER:{userId}
     * - 비로그인: GUEST:{hash(ip|ua)}
     */
    private String viewerKey;

    /**
     * ]
     * ✅ TTL 기준 시간 (24h 후 자동 삭제)
     */
    @Indexed(name = "ttl_createdAt", expireAfterSeconds = 60 * 60 * 24)
    private LocalDateTime createdAt;
}
