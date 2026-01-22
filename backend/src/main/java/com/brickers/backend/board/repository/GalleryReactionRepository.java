package com.brickers.backend.board.repository;

import com.brickers.backend.board.entity.GalleryReactionEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface GalleryReactionRepository extends MongoRepository<GalleryReactionEntity, String> {
    Optional<GalleryReactionEntity> findByUserIdAndPostId(String userId, String postId);

    void deleteByUserIdAndPostId(String userId, String postId);
}
