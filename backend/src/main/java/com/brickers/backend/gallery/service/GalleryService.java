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
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GalleryService {

    private final GalleryPostRepository galleryPostRepository;
    private final GalleryBookmarkRepository galleryBookmarkRepository;
    private final GalleryReactionRepository galleryReactionRepository;
    private final CurrentUserService currentUserService;
    private final GalleryRevalidateService revalidateService;

    /** 게시글 생성: 로그인 유저를 author로 설정하고 게시글을 저장한다. */
    public GalleryResponse create(Authentication auth, GalleryCreateRequest req) {
        User me = currentUserService.get(auth);
        validateTitle(req.getTitle());

        // ✅ jobId 중복 체크 (이미 갤러리에 등록된 Job인지 확인)
        String jobId = req.getJobId();
        if (jobId != null && !jobId.isBlank()) {
            if (galleryPostRepository.existsByJobIdAndDeletedFalse(jobId)) {
                throw new IllegalStateException("이미 갤러리에 등록된 작품입니다.");
            }
        }

        LocalDateTime now = LocalDateTime.now();
        GalleryPostEntity post = GalleryPostEntity.builder()
                .jobId(jobId) // ✅ jobId 저장
                .authorId(me.getId())
                .authorNickname(me.getNickname())
                .authorProfileImage(me.getProfileImage())
                .title(req.getTitle().trim())
                .content(req.getContent())
                .tags(req.getTags())
                .thumbnailUrl(normalizeUrlOrNull(req.getThumbnailUrl()))
                .ldrUrl(normalizeUrlOrNull(req.getLdrUrl()))
                .sourceImageUrl(normalizeUrlOrNull(req.getSourceImageUrl()))
                .glbUrl(normalizeUrlOrNull(req.getGlbUrl()))
                .visibility(req.getVisibility() == null ? Visibility.PUBLIC : req.getVisibility())
                .deleted(false)
                .createdAt(now)
                .updatedAt(now)
                .build();

        galleryPostRepository.save(post);

        // Next.js ISR 캐시 갱신
        revalidateService.onPostCreated(post.getId(), post.getTitle());

        return toResponse(post);
    }

    /** 공개 게시글 목록: PUBLIC + deleted=false를 최신순(createdAt DESC)으로 페이징 조회한다. */
    public Page<GalleryResponse> listPublic(int page, int size, String sort, Authentication authOrNull) {
        Pageable pageable = pageReq(page, size, sort);

        Page<GalleryPostEntity> result = galleryPostRepository.findByDeletedFalseAndVisibility(Visibility.PUBLIC,
                pageable);

        String userId = currentUserService.getUserIdOrNull(authOrNull);
        return result.map(p -> this.toResponseWithUserState(p, userId));
    }

    /** 공개 게시글 검색: q(제목/내용) 또는 tag로 PUBLIC + deleted=false를 페이징 조회한다. */
    public Page<GalleryResponse> searchPublic(String q, String tag, int page, int size, String sort,
            Authentication authOrNull) {
        Pageable pageable = pageReq(page, size, sort);
        String userId = currentUserService.getUserIdOrNull(authOrNull);

        if (q != null && !q.trim().isEmpty()) {
            Page<GalleryPostEntity> result = galleryPostRepository.searchByTitleOrContent(Visibility.PUBLIC, q.trim(),
                    pageable);
            return result.map(p -> this.toResponseWithUserState(p, userId));
        }

        if (tag != null && !tag.trim().isEmpty()) {
            Page<GalleryPostEntity> result = galleryPostRepository.findByDeletedFalseAndVisibilityAndTagsContaining(
                    Visibility.PUBLIC, tag.trim(), pageable);
            return result.map(p -> this.toResponseWithUserState(p, userId));
        }

        return listPublic(page, size, sort, authOrNull);
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
        if (req.getLdrUrl() != null)
            post.setLdrUrl(normalizeUrlOrNull(req.getLdrUrl()));
        if (req.getSourceImageUrl() != null)
            post.setSourceImageUrl(normalizeUrlOrNull(req.getSourceImageUrl()));
        if (req.getGlbUrl() != null)
            post.setGlbUrl(normalizeUrlOrNull(req.getGlbUrl()));
        if (req.getVisibility() != null)
            post.setVisibility(req.getVisibility());

        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);

        // Next.js ISR 캐시 갱신
        revalidateService.onPostUpdated(post.getId(), post.getTitle());

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

        // Next.js ISR 캐시 갱신
        revalidateService.onPostDeleted(post.getId(), post.getTitle());
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

        // http/https URL만 허용 (S3 URL 등)
        // /uploads/ 같은 상대경로는 Next.js Image에서 사용 불가하므로 제외
        if (u.startsWith("http://") || u.startsWith("https://"))
            return u;
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
            Optional<GalleryBookmarkEntity> bookmark = galleryBookmarkRepository.findByUserIdAndPostId(userId,
                    post.getId());
            bookmarked = bookmark.isPresent();

            // 반응 상태 조회
            Optional<GalleryReactionEntity> reaction = galleryReactionRepository.findByUserIdAndPostId(userId,
                    post.getId());
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
                .ldrUrl(post.getLdrUrl())
                .sourceImageUrl(post.getSourceImageUrl())
                .glbUrl(post.getGlbUrl())
                .visibility(post.getVisibility())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .likeCount(Math.max(0, post.getLikeCount()))
                .dislikeCount(Math.max(0, post.getDislikeCount()))
                .viewCount(Math.max(0, post.getViewCount()))
                .commentCount(Math.max(0, post.getCommentCount()))
                .bookmarked(bookmarked)
                .myReaction(myReaction)
                .build();
    }

    public List<String> getPopularTags() {
        return galleryPostRepository.findAllTags();
    }
}
