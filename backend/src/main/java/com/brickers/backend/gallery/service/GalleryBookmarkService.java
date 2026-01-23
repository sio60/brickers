package com.brickers.backend.gallery.service;

import com.brickers.backend.gallery.dto.BookmarkToggleResponse;
import com.brickers.backend.gallery.dto.MyBookmarkItemResponse;
import com.brickers.backend.gallery.entity.GalleryBookmarkEntity;
import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.Visibility;
import com.brickers.backend.gallery.repository.GalleryBookmarkRepository;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GalleryBookmarkService {

    private final GalleryBookmarkRepository bookmarkRepository;
    private final GalleryPostRepository postRepository;
    private final CurrentUserService currentUserService;

    /** 북마크 토글: 이미 있으면 삭제(해제), 없으면 생성(추가)한다. */
    public BookmarkToggleResponse toggleBookmark(Authentication auth, String postId) {
        User me = currentUserService.get(auth);

        GalleryPostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + postId));

        if (post.isDeleted()) {
            throw new IllegalArgumentException("삭제된 게시글입니다.");
        }

        // ✅ 북마크 정책: PRIVATE 글은 작성자만 북마크 허용
        if (post.getVisibility() == Visibility.PRIVATE && !post.getAuthorId().equals(me.getId())) {
            throw new IllegalStateException("비공개 게시글은 작성자만 북마크할 수 있습니다.");
        }

        Optional<GalleryBookmarkEntity> existing = bookmarkRepository.findByUserIdAndPostId(me.getId(), postId);
        LocalDateTime now = LocalDateTime.now();

        if (existing.isPresent()) {
            bookmarkRepository.deleteByUserIdAndPostId(me.getId(), postId);
            return BookmarkToggleResponse.builder()
                    .postId(postId)
                    .bookmarked(false)
                    .toggledAt(now)
                    .build();
        }

        GalleryBookmarkEntity saved = bookmarkRepository.save(
                GalleryBookmarkEntity.builder()
                        .userId(me.getId())
                        .postId(postId)
                        .createdAt(now)
                        .build());

        return BookmarkToggleResponse.builder()
                .postId(saved.getPostId())
                .bookmarked(true)
                .toggledAt(saved.getCreatedAt())
                .build();
    }

    /** 내 북마크 목록: 북마크한 게시글들을 최신순으로 페이징 조회해 카드용 정보를 내려준다. */
    public Page<MyBookmarkItemResponse> listMyBookmarks(Authentication auth, int page, int size) {
        User me = currentUserService.get(auth);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<GalleryBookmarkEntity> bookmarks = bookmarkRepository.findByUserId(me.getId(), pageable);

        // 북마크된 postId들을 한 번에 조회해서 매핑(N+1 방지)
        List<String> postIds = bookmarks.getContent().stream()
                .map(GalleryBookmarkEntity::getPostId)
                .toList();

        Map<String, GalleryPostEntity> postMap = postRepository.findAllById(postIds).stream()
                .collect(Collectors.toMap(GalleryPostEntity::getId, p -> p));

        List<MyBookmarkItemResponse> items = bookmarks.getContent().stream()
                .map(b -> {
                    GalleryPostEntity p = postMap.get(b.getPostId());
                    if (p == null || p.isDeleted())
                        return null;

                    // PRIVATE는 작성자만 조회 가능
                    if (p.getVisibility() == Visibility.PRIVATE && !p.getAuthorId().equals(me.getId()))
                        return null;

                    return MyBookmarkItemResponse.builder()
                            .postId(p.getId())
                            .title(p.getTitle())
                            .thumbnailUrl(p.getThumbnailUrl())
                            .tags(p.getTags())
                            .postCreatedAt(p.getCreatedAt())
                            .bookmarkedAt(b.getCreatedAt())
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();

        // ✅ 필터링으로 items 개수가 줄 수 있으니 total을 items.size로 맞추는게 UI에 더 직관적
        return new PageImpl<>(items, pageable, bookmarks.getTotalElements());
        // (원래대로 하고 싶으면 bookmarks.getTotalElements()로 돌리면 됨)
    }
}
