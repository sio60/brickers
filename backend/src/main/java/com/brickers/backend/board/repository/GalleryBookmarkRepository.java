package com.brickers.backend.board.repository;

import com.brickers.backend.board.entity.GalleryBookmarkEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface GalleryBookmarkRepository extends MongoRepository<GalleryBookmarkEntity, String> {

    Optional<GalleryBookmarkEntity> findByUserIdAndPostId(String userId, String postId);

    Page<GalleryBookmarkEntity> findByUserId(String userId, Pageable pageable);

    void deleteByUserIdAndPostId(String userId, String postId);
}
