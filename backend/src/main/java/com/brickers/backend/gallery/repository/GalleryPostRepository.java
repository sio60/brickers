package com.brickers.backend.gallery.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.Visibility;

public interface GalleryPostRepository extends MongoRepository<GalleryPostEntity, String> {
        Page<GalleryPostEntity> findByDeletedFalseAndVisibility(Visibility visibility, Pageable pageable);

        Page<GalleryPostEntity> findByDeletedFalseAndAuthorIdAndVisibility(String authorId, Visibility visibility,
                        Pageable pageable);

        // 태그로 검색 (PUBLIC만) - tags 배열에 포함되는지
        Page<GalleryPostEntity> findByDeletedFalseAndVisibilityAndTagsContaining(
                        Visibility visibility, String tag, Pageable pageable);

        // ✅ 제목 OR 내용 검색 (PUBLIC만 쓰면 service에서 Visibility.PUBLIC 넣으면 됨)
        @Query("""
                        {
                          "deleted": false,
                          "visibility": ?0,
                          "$or": [
                            {"title": {"$regex": ?1, "$options": "i"}},
                            {"content": {"$regex": ?1, "$options": "i"}}
                          ]
                        }
                        """)
        Page<GalleryPostEntity> searchByTitleOrContent(Visibility visibility, String q, Pageable pageable);

        // ✅ 내 게시글
        Page<GalleryPostEntity> findByDeletedFalseAndAuthorId(String authorId, Pageable pageable);
}
