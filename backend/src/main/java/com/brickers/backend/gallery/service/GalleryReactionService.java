package com.brickers.backend.gallery.service;

import com.brickers.backend.gallery.dto.ReactionToggleRequest;
import com.brickers.backend.gallery.dto.ReactionToggleResponse;
import com.brickers.backend.gallery.entity.*;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.gallery.repository.GalleryReactionRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GalleryReactionService {

    private final GalleryReactionRepository reactionRepository;
    private final GalleryPostRepository postRepository;
    private final CurrentUserService currentUserService;
    private final MongoTemplate mongoTemplate;

    /** 좋아요/싫어요 토글(전환 포함) + post 카운트 갱신 */
    public ReactionToggleResponse toggle(Authentication auth, String postId, ReactionToggleRequest req) {
        User me = currentUserService.get(auth);

        GalleryPostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + postId));
        if (post.isDeleted())
            throw new IllegalArgumentException("삭제된 게시글입니다.");

        // ✅ PRIVATE 정책(북마크와 동일하게)
        if (post.getVisibility() == Visibility.PRIVATE && !post.getAuthorId().equals(me.getId())) {
            throw new IllegalStateException("비공개 게시글은 작성자만 반응할 수 있습니다.");
        }

        if (req == null || req.getType() == null) {
            throw new IllegalArgumentException("type(LIKE/DISLIKE)는 필수입니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        ReactionType target = req.getType();

        Optional<GalleryReactionEntity> existingOpt = reactionRepository.findByUserIdAndPostId(me.getId(), postId);

        ReactionType finalState; // null이면 반응없음

        if (existingOpt.isEmpty()) {
            reactionRepository.save(GalleryReactionEntity.builder()
                    .userId(me.getId())
                    .postId(postId)
                    .type(target)
                    .createdAt(now)
                    .updatedAt(now)
                    .build());

            incPostCounts(postId,
                    target == ReactionType.LIKE ? 1 : 0,
                    target == ReactionType.DISLIKE ? 1 : 0);

            finalState = target;

        } else {
            GalleryReactionEntity existing = existingOpt.get();

            if (existing.getType() == target) {
                reactionRepository.deleteByUserIdAndPostId(me.getId(), postId);

                incPostCounts(postId,
                        target == ReactionType.LIKE ? -1 : 0,
                        target == ReactionType.DISLIKE ? -1 : 0);

                finalState = null;

            } else {
                existing.setType(target);
                existing.setUpdatedAt(now);
                reactionRepository.save(existing);

                // 기존 -1, 신규 +1
                if (target == ReactionType.LIKE)
                    incPostCounts(postId, +1, -1);
                else
                    incPostCounts(postId, -1, +1);

                finalState = target;
            }
        }

        GalleryPostEntity refreshed = postRepository.findById(postId).orElseThrow();

        // ✅ 응답에서 음수 방지(부기능 단계 실용적)
        long likeCount = Math.max(0, refreshed.getLikeCount());
        long dislikeCount = Math.max(0, refreshed.getDislikeCount());

        return ReactionToggleResponse.builder()
                .postId(postId)
                .myReaction(finalState)
                .likeCount(likeCount)
                .dislikeCount(dislikeCount)
                .toggledAt(now)
                .build();
    }

    /** post 카운트 원자적 증가($inc) */
    private void incPostCounts(String postId, long likeDelta, long dislikeDelta) {
        Update update = new Update()
                .set("updatedAt", LocalDateTime.now());

        if (likeDelta != 0)
            update.inc("likeCount", likeDelta);
        if (dislikeDelta != 0)
            update.inc("dislikeCount", dislikeDelta);

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(postId)),
                update,
                GalleryPostEntity.class);
    }
}
