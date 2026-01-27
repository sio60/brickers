package com.brickers.backend.user.service;

import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.user.dto.UserActivitySummaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * 유저 관련 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final GalleryPostRepository galleryPostRepository;
    private final GenerateJobRepository generateJobRepository;

    /**
     * 유저 활동 요약 조회
     */
    public UserActivitySummaryResponse getActivitySummary(String userId) {
        // 게시글 수
        long postCount = galleryPostRepository.countByAuthorIdAndDeletedFalse(userId);

        // 총 좋아요, 조회수 (게시글 조회 후 합산)
        long totalLikes = 0;
        long totalViews = 0;

        // 최대 100개 게시글까지만 조회해서 합산 (성능 고려)
        Page<GalleryPostEntity> posts = galleryPostRepository.findByDeletedFalseAndAuthorId(
                userId, PageRequest.of(0, 100));

        for (GalleryPostEntity post : posts.getContent()) {
            totalLikes += post.getLikeCount();
            totalViews += post.getViewCount();
        }

        // 작업 수
        long jobCount = generateJobRepository.countByUserId(userId);
        long completedJobCount = generateJobRepository.countByUserIdAndStatus(userId, JobStatus.DONE);

        return UserActivitySummaryResponse.builder()
                .userId(userId)
                .postCount(postCount)
                .totalLikes(totalLikes)
                .totalViews(totalViews)
                .jobCount(jobCount)
                .completedJobCount(completedJobCount)
                .build();
    }
}
