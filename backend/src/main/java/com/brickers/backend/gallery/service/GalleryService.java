package com.brickers.backend.gallery.service;

import com.brickers.backend.common.exception.ForbiddenException;
import com.brickers.backend.gallery.dto.GalleryCreateRequest;
import com.brickers.backend.gallery.dto.GalleryResponse;
import com.brickers.backend.gallery.dto.GalleryUpdateRequest;
import com.brickers.backend.gallery.entity.Visibility;
import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.job.entity.KidsLevel;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 🖼️ GalleryService
 * 
 * 갤러리 게시글의 비즈니스 흐름(Orchestration)을 담당합니다.
 * 실제 로직은 Mapper, Helper, Resolver 등으로 위임하여 슬림하게 유지합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GalleryService {

    private final GalleryPostRepository galleryPostRepository;
    private final GenerateJobRepository generateJobRepository;
    private final CurrentUserService currentUserService;
    private final GalleryRevalidateService revalidateService;

    private final GalleryMapper galleryMapper;
    private final GalleryHelper galleryHelper;
    private final GalleryLevelResolver levelResolver;

    /** 게시글 생성 */
    @Transactional
    public GalleryResponse create(Authentication auth, GalleryCreateRequest req) {
        User me = currentUserService.get(auth);
        galleryHelper.validateTitle(req.getTitle());

        if (req.getJobId() != null && !req.getJobId().isBlank()) {
            if (galleryPostRepository.existsByJobIdAndDeletedFalse(req.getJobId())) {
                throw new IllegalStateException("이미 갤러리에 등록된 작품입니다.");
            }
        }

        GalleryPostEntity post = galleryMapper.toEntity(req, me.getId(), me.getNickname(), me.getProfileImage());
        levelResolver.resolveAndSetLevel(post, generateJobRepository);

        galleryPostRepository.save(post);
        revalidateService.onPostCreated(post.getId(), post.getTitle());

        return galleryMapper.toResponse(post, me.getId());
    }

    /** 공개 게시글 목록 조회 */
    @Transactional(readOnly = true)
    public Page<GalleryResponse> listPublic(int page, int size, String sort, String level, Authentication authOrNull) {
        Pageable pageable = galleryHelper.createPageRequest(page, size, sort);
        KidsLevel targetLevel = galleryHelper.parseLevel(level);

        Page<GalleryPostEntity> result = (targetLevel == null)
                ? galleryPostRepository.findByDeletedFalseAndVisibility(Visibility.PUBLIC, pageable)
                : galleryPostRepository.findByDeletedFalseAndVisibilityAndLevel(Visibility.PUBLIC, targetLevel,
                        pageable);

        String userId = currentUserService.getUserIdOrNull(authOrNull);
        return result.map(p -> galleryMapper.toResponse(p, userId));
    }

    /** 공개 게시글 검색 */
    @Transactional(readOnly = true)
    public Page<GalleryResponse> searchPublic(String q, String tag, int page, int size, String sort,
            Authentication authOrNull) {
        Pageable pageable = galleryHelper.createPageRequest(page, size, sort);
        String userId = currentUserService.getUserIdOrNull(authOrNull);

        Page<GalleryPostEntity> result;
        if (q != null && !q.isBlank()) {
            result = galleryPostRepository.searchByTitleOrContent(Visibility.PUBLIC, q.trim(), pageable);
        } else if (tag != null && !tag.isBlank()) {
            result = galleryPostRepository.findByDeletedFalseAndVisibilityAndTagsContaining(Visibility.PUBLIC,
                    tag.trim(), pageable);
        } else {
            return listPublic(page, size, sort, null, authOrNull);
        }

        return result.map(p -> galleryMapper.toResponse(p, userId));
    }

    /** 게시글 상세 조회 */
    @Transactional(readOnly = true)
    public GalleryResponse getDetail(String id, Authentication authOrNull) {
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없거나 삭제되었습니다. id=" + id));

        String loginUserId = currentUserService.getUserIdOrNull(authOrNull);
        if (post.getVisibility() == Visibility.PRIVATE) {
            if (loginUserId == null || !post.getAuthorId().equals(loginUserId)) {
                throw new ForbiddenException("비공개 게시글에 대한 접근 권한이 없습니다.");
            }
        }

        return galleryMapper.toResponse(post, loginUserId);
    }

    /** 게시글 수정 */
    @Transactional
    public GalleryResponse update(String id, Authentication auth, GalleryUpdateRequest req) {
        User me = currentUserService.get(auth);
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + id));

        if (!post.getAuthorId().equals(me.getId()))
            throw new IllegalStateException("수정 권한이 없습니다.");

        galleryMapper.updateFromRequest(post, req);
        galleryPostRepository.save(post);

        revalidateService.onPostUpdated(post.getId(), post.getTitle());
        return galleryMapper.toResponse(post, me.getId());
    }

    /** 게시글 삭제 */
    @Transactional
    public void delete(String id, Authentication auth) {
        User me = currentUserService.get(auth);
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + id));

        if (post.isDeleted())
            return;
        if (!post.getAuthorId().equals(me.getId()))
            throw new IllegalStateException("삭제 권한이 없습니다.");

        post.setDeleted(true);
        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);

        revalidateService.onPostDeleted(post.getId(), post.getTitle());
    }

    /** 내 게시글 목록 조회 */
    @Transactional(readOnly = true)
    public Page<GalleryResponse> listMine(Authentication auth, int page, int size, String sort) {
        User me = currentUserService.get(auth);
        Pageable pageable = galleryHelper.createPageRequest(page, size, sort);
        Page<GalleryPostEntity> result = galleryPostRepository.findByDeletedFalseAndAuthorId(me.getId(), pageable);
        return result.map(p -> galleryMapper.toResponse(p, me.getId()));
    }

    /** 스크린샷 업데이트 */
    @Transactional
    public void updateScreenshotUrls(String postId, Map<String, String> screenshotUrls) {
        GalleryPostEntity post = galleryPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + postId));
        post.setScreenshotUrls(screenshotUrls);
        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);
    }

    public List<String> getPopularTags() {
        return galleryPostRepository.findAllTags();
    }
}
