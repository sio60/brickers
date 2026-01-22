package com.brickers.backend.board.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class MyBookmarkItemResponse {
    private String postId;
    private String title;
    private String thumbnailUrl;
    private List<String> tags;
    private LocalDateTime bookmarkedAt;
    private LocalDateTime postCreatedAt;
}
