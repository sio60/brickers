package com.brickers.backend.gallery.repository;

import com.brickers.backend.gallery.entity.GalleryCommentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GalleryCommentRepository extends MongoRepository<GalleryCommentEntity, String> {

    Page<GalleryCommentEntity> findByPostIdAndDeletedFalseOrderByCreatedAtDesc(String postId, Pageable pageable);

    List<GalleryCommentEntity> findByPostIdAndDeletedFalse(String postId);

    List<GalleryCommentEntity> findByAuthorId(String authorId);

    long countByPostIdAndDeletedFalse(String postId);
}
