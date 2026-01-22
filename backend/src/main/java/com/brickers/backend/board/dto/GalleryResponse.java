package com.brickers.backend.board.dto;

import com.brickers.backend.board.entity.Visibility;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GalleryResponse {
    private String id;

    private String authorId;
    private String authorNickname;
    private String authorProfileImage;

    private String title;
    private String content;
    private List<String> tags;
    private String thumbnailUrl;

    private Visibility visibility;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ✅ 추가: 좋아요/싫어요/조회수
    private long likeCount;
    private long dislikeCount;
    private long viewCount;
}
