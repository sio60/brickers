package com.brickers.backend.gallery.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

import com.brickers.backend.gallery.entity.ReactionType;

@Data
@Builder
public class ReactionToggleResponse {
    private String postId;

    // 최종 상태: null이면 “반응 없음”
    private ReactionType myReaction;

    private long likeCount;
    private long dislikeCount;

    private LocalDateTime toggledAt;
}
