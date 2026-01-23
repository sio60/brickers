package com.brickers.backend.gallery.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.brickers.backend.gallery.entity.GalleryBookmarkEntity;

import java.util.Optional;

public interface GalleryBookmarkRepository extends MongoRepository<GalleryBookmarkEntity, String> {

    Optional<GalleryBookmarkEntity> findByUserIdAndPostId(String userId, String postId);

    Page<GalleryBookmarkEntity> findByUserId(String userId, Pageable pageable);

    void deleteByUserIdAndPostId(String userId, String postId);
}
