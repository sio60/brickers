package com.brickers.backend.gallery.service;

import com.brickers.backend.common.exception.ForbiddenException;
import com.brickers.backend.gallery.dto.GalleryCreateRequest;
import com.brickers.backend.gallery.dto.GalleryResponse;
import com.brickers.backend.gallery.dto.GalleryUpdateRequest;
import com.brickers.backend.gallery.entity.GalleryBookmarkEntity;
import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.GalleryReactionEntity;
import com.brickers.backend.gallery.entity.Visibility;
import com.brickers.backend.gallery.repository.GalleryBookmarkRepository;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.gallery.repository.GalleryReactionRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GalleryService {

    private final GalleryPostRepository galleryPostRepository;
    private final GalleryBookmarkRepository galleryBookmarkRepository;
    private final GalleryReactionRepository galleryReactionRepository;
    private final CurrentUserService currentUserService;

    /** 게시글 생성: 로그인 유저를 author로 설정하고 게시글을 저장한다. */
    public GalleryResponse create(Authentication auth, GalleryCreateRequest req) {
        User me = currentUserService.get(auth);
        validateTitle(req.getTitle());

        LocalDateTime now = LocalDateTime.now();
        GalleryPostEntity post = GalleryPostEntity.builder()
                .authorId(me.getId())
                .authorNickname(me.getNickname())
                .authorProfileImage(me.getProfileImage())
                .title(req.getTitle().trim())
                .content(req.getContent())
                .tags(req.getTags())
                .thumbnailUrl(normalizeUrlOrNull(req.getThumbnailUrl()))
                .visibility(req.getVisibility() == null ? Visibility.PUBLIC : req.getVisibility())
                .deleted(false)
                .createdAt(now)
                .updatedAt(now)
                .build();

        galleryPostRepository.save(post);
        return toResponse(post);
    }

    /** 공개 게시글 목록: PUBLIC + deleted=false를 최신순(createdAt DESC)으로 페이징 조회한다. */
    public Page<GalleryResponse> listPublic(int page, int size, String sort) {
        Pageable pageable = pageReq(page, size, sort);

        Page<GalleryPostEntity> result = galleryPostRepository.findByDeletedFalseAndVisibility(Visibility.PUBLIC,
                pageable);

        return result.map(this::toResponse);
    }

    /** 공개 게시글 검색: q(제목/내용) 또는 tag로 PUBLIC + deleted=false를 페이징 조회한다. */
    public Page<GalleryResponse> searchPublic(String q, String tag, int page, int size, String sort) {
        Pageable pageable = pageReq(page, size, sort);

        if (q != null && !q.trim().isEmpty()) {
            Page<GalleryPostEntity> result = galleryPostRepository.searchByTitleOrContent(Visibility.PUBLIC, q.trim(),
                    pageable);
            return result.map(this::toResponse);
        }

        if (tag != null && !tag.trim().isEmpty()) {
            Page<GalleryPostEntity> result = galleryPostRepository.findByDeletedFalseAndVisibilityAndTagsContaining(
                    Visibility.PUBLIC, tag.trim(), pageable);
            return result.map(this::toResponse);
        }

        return listPublic(page, size, sort);
    }

    private PageRequest pageReq(int page, int size, String sort) {
        String s = (sort == null) ? "latest" : sort.trim().toLowerCase();

        return switch (s) {
            case "views" -> PageRequest.of(page, size,
                    Sort.by(Sort.Direction.DESC, "viewCount")
                            .and(Sort.by(Sort.Direction.DESC, "createdAt")));
            case "likes" -> PageRequest.of(page, size,
                    Sort.by(Sort.Direction.DESC, "likeCount")
                            .and(Sort.by(Sort.Direction.DESC, "createdAt")));
            case "popular" -> PageRequest.of(page, size,
                    Sort.by(Sort.Direction.DESC, "likeCount")
                            .and(Sort.by(Sort.Direction.DESC, "viewCount"))
                            .and(Sort.by(Sort.Direction.DESC, "createdAt")));
            default -> PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        };
    }

    /** 게시글 상세: PUBLIC은 누구나, PRIVATE는 작성자만 조회 가능하도록 권한을 체크한다. */
    public GalleryResponse getDetail(String id, Authentication authOrNull) {
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + id));

        if (post.isDeleted())
            throw new IllegalArgumentException("삭제된 게시글입니다.");

        String userId = null;
        if (post.getVisibility() == Visibility.PRIVATE) {
            User me = currentUserService.get(authOrNull); // null이면 ForbiddenException("로그인이 필요합니다.")
            if (!post.getAuthorId().equals(me.getId())) {
                throw new ForbiddenException("비공개 게시글에 대한 접근 권한이 없습니다.");
            }
            userId = me.getId();
        } else if (authOrNull != null) {
            // PUBLIC이지만 로그인한 경우 사용자 ID 가져오기
            try {
                User me = currentUserService.get(authOrNull);
                userId = me.getId();
            } catch (Exception ignored) {
                // 로그인 안 된 경우 무시
            }
        }

        return toResponseWithUserState(post, userId);
    }

    /** 게시글 수정: 작성자만 수정 가능하며, 전달된 필드만 부분 업데이트(PATCH)한다. */
    public GalleryResponse update(String id, Authentication auth, GalleryUpdateRequest req) {
        User me = currentUserService.get(auth);

        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + id));

        if (post.isDeleted())
            throw new IllegalArgumentException("삭제된 게시글입니다.");
        if (!post.getAuthorId().equals(me.getId()))
            throw new IllegalStateException("수정 권한이 없습니다.");

        if (req.getTitle() != null) {
            validateTitle(req.getTitle());
            post.setTitle(req.getTitle().trim());
        }
        if (req.getContent() != null)
            post.setContent(req.getContent());
        if (req.getTags() != null)
            post.setTags(req.getTags());
        if (req.getThumbnailUrl() != null)
            post.setThumbnailUrl(normalizeUrlOrNull(req.getThumbnailUrl()));
        if (req.getVisibility() != null)
            post.setVisibility(req.getVisibility());

        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);

        return toResponse(post);
    }

    /** 게시글 삭제(소프트 삭제): 작성자만 삭제 가능하며 deleted=true로 처리한다. */
    public void delete(String id, Authentication auth) {
        User me = currentUserService.get(auth);

        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + id));

        if (post.isDeleted())
            return; // 멱등
        if (!post.getAuthorId().equals(me.getId()))
            throw new IllegalStateException("삭제 권한이 없습니다.");

        post.setDeleted(true);
        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);
    }

    /** 내 게시글 목록: 내 글(PUBLIC/PRIVATE 모두) 중 deleted=false를 최신순으로 페이징 조회한다. */
    public Page<GalleryResponse> listMine(Authentication auth, int page, int size, String sort) {
        User me = currentUserService.get(auth);
        Pageable pageable = pageReq(page, size, sort);

        Page<GalleryPostEntity> result = galleryPostRepository.findByDeletedFalseAndAuthorId(me.getId(), pageable);

        return result.map(this::toResponse);
    }

    // ========================= helpers =========================

    private void validateTitle(String title) {
        if (title == null)
            throw new IllegalArgumentException("title은 필수입니다.");
        String t = title.trim();
        if (t.isEmpty())
            throw new IllegalArgumentException("title은 비어 있을 수 없습니다.");
        if (t.length() > 50)
            throw new IllegalArgumentException("title은 50자 이하여야 합니다.");
    }

    private String normalizeUrlOrNull(String url) {
        if (url == null)
            return null;
        String u = url.trim();
        if (u.isEmpty())
            return null;

        if (u.startsWith("http://") || u.startsWith("https://"))
            return u;
        if (u.startsWith("/uploads/"))
            return u; // ✅ 상대경로 허용
        return null;
    }

    private GalleryResponse toResponse(GalleryPostEntity post) {
        return toResponseWithUserState(post, null);
    }

    private GalleryResponse toResponseWithUserState(GalleryPostEntity post, String userId) {
        Boolean bookmarked = null;
        String myReaction = null;

        if (userId != null) {
            // 북마크 상태 조회
            Optional<GalleryBookmarkEntity> bookmark = galleryBookmarkRepository.findByUserIdAndPostId(userId, post.getId());
            bookmarked = bookmark.isPresent();

            // 반응 상태 조회
            Optional<GalleryReactionEntity> reaction = galleryReactionRepository.findByUserIdAndPostId(userId, post.getId());
            myReaction = reaction.map(r -> r.getType().name()).orElse(null);
        }

        return GalleryResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorNickname(post.getAuthorNickname())
                .authorProfileImage(post.getAuthorProfileImage())
                .title(post.getTitle())
                .content(post.getContent())
                .tags(post.getTags())
                .thumbnailUrl(post.getThumbnailUrl())
                .visibility(post.getVisibility())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .likeCount(Math.max(0, post.getLikeCount()))
                .dislikeCount(Math.max(0, post.getDislikeCount()))
                .viewCount(Math.max(0, post.getViewCount()))
                .bookmarked(bookmarked)
                .myReaction(myReaction)
                .build();
    }

}
