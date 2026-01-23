package com.brickers.backend.gallery.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.brickers.backend.gallery.entity.GalleryReactionEntity;

import java.util.Optional;

public interface GalleryReactionRepository extends MongoRepository<GalleryReactionEntity, String> {
    Optional<GalleryReactionEntity> findByUserIdAndPostId(String userId, String postId);

    void deleteByUserIdAndPostId(String userId, String postId);
}
