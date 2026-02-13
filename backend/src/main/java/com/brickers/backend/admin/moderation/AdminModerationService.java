package com.brickers.backend.admin.moderation;

import com.brickers.backend.admin.moderation.dto.ModerationItemDto;
import com.brickers.backend.gallery.entity.GalleryCommentEntity;
import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.Visibility;
import com.brickers.backend.gallery.repository.GalleryCommentRepository;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminModerationService {

    private final GalleryPostRepository postRepository;
    private final GalleryCommentRepository commentRepository;

    @Transactional(readOnly = true)
    public List<ModerationItemDto> getRecentContents(int days, int limit) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);

        // 1. Recent Posts
        List<GalleryPostEntity> posts = postRepository
                .findByDeleted(false, PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent().stream()
                .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(since))
                .collect(Collectors.toList());

        // 2. Recent Comments
        List<GalleryCommentEntity> comments = commentRepository
                .findByDeletedFalse(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent().stream()
                .filter(c -> c.getCreatedAt() != null && c.getCreatedAt().isAfter(since))
                .collect(Collectors.toList());

        List<ModerationItemDto> items = new ArrayList<>();

        for (GalleryPostEntity p : posts) {
            items.add(ModerationItemDto.builder()
                    .id(p.getId())
                    .type("post")
                    .content(p.getTitle() + "\n" + p.getContent())
                    .authorId(p.getAuthorId())
                    .authorNickname(p.getAuthorNickname())
                    .createdAt(p.getCreatedAt())
                    .build());
        }

        for (GalleryCommentEntity c : comments) {
            items.add(ModerationItemDto.builder()
                    .id(c.getId())
                    .type("comment")
                    .content(c.getContent())
                    .authorId(c.getAuthorId())
                    .authorNickname(c.getAuthorNickname())
                    .createdAt(c.getCreatedAt())
                    .build());
        }

        return items.stream()
                .sorted(Comparator.comparing(ModerationItemDto::getCreatedAt).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }

    @Transactional
    public void hideContent(String type, String targetId, String reason) {
        if ("post".equals(type)) {
            postRepository.findById(targetId).ifPresent(post -> {
                post.setVisibility(Visibility.PRIVATE);
                post.setUpdatedAt(LocalDateTime.now());
                postRepository.save(post);
            });
        } else if ("comment".equals(type)) {
            commentRepository.findById(targetId).ifPresent(comment -> {
                comment.setDeleted(true);
                comment.setUpdatedAt(LocalDateTime.now());
                commentRepository.save(comment);
            });
        }
    }
}
