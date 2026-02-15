package com.brickers.backend.config;

import com.brickers.backend.gallery.entity.GalleryViewLogEntity;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexInfo;
import org.springframework.data.mongodb.core.index.IndexOperations;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class MongoIndexInitializer {

    private final MongoTemplate mongoTemplate;
    private final UserRepository userRepository;

    @PostConstruct
    public void ensureIndexes() {
        ensureGalleryViewLogIndexes();
        ensureUserIndexes();
    }

    private void ensureGalleryViewLogIndexes() {
        IndexOperations ops = mongoTemplate.indexOps(GalleryViewLogEntity.class);

        ops.ensureIndex(new Index()
                .on("postId", Sort.Direction.ASC)
                .on("viewerKey", Sort.Direction.ASC)
                .unique()
                .named("uk_post_viewer"));

        ops.ensureIndex(new Index()
                .on("createdAt", Sort.Direction.ASC)
                .expire(60 * 60 * 24)
                .named("ttl_createdAt"));

        log.info("[MongoIndexInitializer] ensured indexes for GalleryViewLogEntity");
    }

    private void ensureUserIndexes() {
        IndexOperations ops = mongoTemplate.indexOps(User.class);

        ops.ensureIndex(new Index()
                .on("provider", Sort.Direction.ASC)
                .on("providerId", Sort.Direction.ASC)
                .unique()
                .named("ux_provider_providerId"));

        ops.ensureIndex(new Index()
                .on("email", Sort.Direction.ASC));

        // Normalize legacy nickname data before unique index creation.
        migrateNicknamesForUniqueConstraint();
        rebuildNicknameUniqueIndex(ops);

        log.info("[MongoIndexInitializer] ensured indexes for User");
    }

    private void migrateNicknamesForUniqueConstraint() {
        List<User> users = new ArrayList<>(userRepository.findAll());
        if (users.isEmpty()) {
            return;
        }

        users.sort(Comparator
                .comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(User::getId, Comparator.nullsLast(Comparator.naturalOrder())));

        Set<String> seen = new HashSet<>();
        List<User> changed = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (User user : users) {
            String current = user.getNickname();
            String unique = resolveUniqueNickname(current, user.getId(), seen);
            if (!unique.equals(current)) {
                user.setNickname(unique);
                user.setUpdatedAt(now);
                changed.add(user);
            }
            seen.add(unique);
        }

        if (!changed.isEmpty()) {
            userRepository.saveAll(changed);
            log.warn("[MongoIndexInitializer] nickname migration applied to {} user(s)", changed.size());
        }
    }

    private String resolveUniqueNickname(String rawNickname, String seed, Set<String> seen) {
        String base = normalizeNickname(rawNickname, seed);
        if (!seen.contains(base)) {
            return base;
        }

        for (int i = 1; i <= 9999; i++) {
            String suffix = "_" + i;
            int maxBaseLen = Math.max(1, 20 - suffix.length());
            String head = base.length() > maxBaseLen ? base.substring(0, maxBaseLen) : base;
            String candidate = head + suffix;
            if (!seen.contains(candidate)) {
                return candidate;
            }
        }

        String fallback = "User" + (System.currentTimeMillis() % 1_000_000_000L);
        return fallback.length() > 20 ? fallback.substring(0, 20) : fallback;
    }

    private String normalizeNickname(String rawNickname, String seed) {
        String fallback = "User" + (seed != null && seed.length() >= 6 ? seed.substring(0, 6) : "000000");
        String normalized = rawNickname == null ? "" : rawNickname.trim();
        if (normalized.isEmpty()) {
            normalized = fallback;
        }
        return normalized.length() > 20 ? normalized.substring(0, 20) : normalized;
    }

    private void rebuildNicknameUniqueIndex(IndexOperations ops) {
        // Drop legacy non-unique nickname indexes to avoid option conflicts.
        for (IndexInfo info : ops.getIndexInfo()) {
            boolean isNicknameIndex = info.getIndexFields().size() == 1
                    && "nickname".equals(info.getIndexFields().get(0).getKey());
            if (isNicknameIndex && !info.isUnique()) {
                ops.dropIndex(info.getName());
                log.info("[MongoIndexInitializer] dropped legacy nickname index: {}", info.getName());
            }
        }

        ops.ensureIndex(new Index()
                .on("nickname", Sort.Direction.ASC)
                .unique()
                .named("ux_nickname"));
    }
}
