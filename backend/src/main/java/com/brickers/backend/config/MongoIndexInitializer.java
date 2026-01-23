package com.brickers.backend.config;

import com.brickers.backend.gallery.entity.GalleryViewLogEntity;
import com.brickers.backend.user.entity.User;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class MongoIndexInitializer {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void ensureIndexes() {
        ensureGalleryViewLogIndexes();
        ensureUserIndexes();
    }

    private void ensureGalleryViewLogIndexes() {
        IndexOperations ops = mongoTemplate.indexOps(GalleryViewLogEntity.class);

        // ✅ (postId, viewerKey) 유니크
        ops.ensureIndex(new Index()
                .on("postId", Sort.Direction.ASC)
                .on("viewerKey", Sort.Direction.ASC)
                .unique()
                .named("uk_post_viewer"));

        // ✅ createdAt TTL (24h)
        ops.ensureIndex(new Index()
                .on("createdAt", Sort.Direction.ASC)
                .expire(60 * 60 * 24) // seconds
                .named("ttl_createdAt"));

        log.info("[MongoIndexInitializer] ensured indexes for GalleryViewLogEntity");
    }

    /**
     * ⚠️ 너 지금 users에서 "ix_email" 이름 충돌로 부팅이 깨진 적이 있음.
     * - 해결: 코드에서 name을 명시하지 않거나(추천),
     * - 기존 DB 인덱스 이름과 코드 이름을 동일하게 맞춰야 함.
     */
    private void ensureUserIndexes() {
        IndexOperations ops = mongoTemplate.indexOps(User.class);

        // ✅ provider + providerId unique
        ops.ensureIndex(new Index()
                .on("provider", Sort.Direction.ASC)
                .on("providerId", Sort.Direction.ASC)
                .unique()
                .named("ux_provider_providerId"));

        // ✅ email은 "이름 지정 X"로 충돌 회피(추천)
        ops.ensureIndex(new Index()
                .on("email", Sort.Direction.ASC));

        // ✅ nickname도 필요 시
        ops.ensureIndex(new Index()
                .on("nickname", Sort.Direction.ASC));

        log.info("[MongoIndexInitializer] ensured indexes for User");
    }
}
