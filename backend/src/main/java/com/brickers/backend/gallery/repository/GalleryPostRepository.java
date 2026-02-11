package com.brickers.backend.gallery.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;

import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.Visibility;
import org.springframework.data.mongodb.repository.Aggregation;

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

  // 작성자의 게시글 수
  long countByAuthorIdAndDeletedFalse(String authorId);

  /** ✅ Job ID로 갤러리 포스트 존재 여부 확인 (중복 등록 방지) */
  boolean existsByJobIdAndDeletedFalse(String jobId);

  List<GalleryPostEntity> findByAuthorId(String authorId);

  /** ✅ 공개된 모든 게시글의 태그 중복 제거후 목록 추출 */
  @Aggregation(pipeline = {
      "{ '$match': { 'deleted': false, 'visibility': 'PUBLIC' } }",
      "{ '$unwind': '$tags' }",
      "{ '$group': { '_id': '$tags' } }",
      "{ '$sort': { '_id': 1 } }",
      "{ '$limit': 50 }"
  })
  List<String> findAllTags();
  // ✅ 관리자용 검색 (키워드 + 상태)
  // 키워드(title/nickname), visibility, deleted 여부
  // QueryDSL 없이 동적 쿼리가 어려우므로, 상황별 메서드 정의 또는 Custom Repository 권장.
  // 여기서는 가장 많이 쓸 패턴(키워드 검색)만 추가하고, 필터링은 Service에서 스트림으로 하거나
  // 메서드를 여러 개 만듭니다. 하지만 Pagination 때문에 DB레벨 필터링이 필수입니다.

  // 1. 키워드 O, Visibility O, Deleted O
  @Query("{ '$and': [ { '$or': [ { 'title': { '$regex': ?0, '$options': 'i' } }, { 'authorNickname': { '$regex': ?0, '$options': 'i' } } ] }, { 'visibility': ?1 }, { 'deleted': ?2 } ] }")
  Page<GalleryPostEntity> searchAdmin(String keyword, Visibility visibility, boolean deleted, Pageable pageable);

  // 2. 키워드 O, Visibility X (전체), Deleted O
  @Query("{ '$and': [ { '$or': [ { 'title': { '$regex': ?0, '$options': 'i' } }, { 'authorNickname': { '$regex': ?0, '$options': 'i' } } ] }, { 'deleted': ?1 } ] }")
  Page<GalleryPostEntity> searchAdminNoVisibility(String keyword, boolean deleted, Pageable pageable);

  // 3. 키워드 X, Visibility O, Deleted O
  Page<GalleryPostEntity> findByVisibilityAndDeleted(Visibility visibility, boolean deleted, Pageable pageable);

  // 4. 키워드 X, Visibility X, Deleted O
  Page<GalleryPostEntity> findByDeleted(boolean deleted, Pageable pageable);
}
