package com.brickers.backend.board.dto;

import com.brickers.backend.board.entity.ReactionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

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
