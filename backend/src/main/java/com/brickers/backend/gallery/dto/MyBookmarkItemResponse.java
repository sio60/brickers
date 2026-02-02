package com.brickers.backend.gallery.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class MyBookmarkItemResponse {
    private String id;
    private String title;
    private String thumbnailUrl;
    private String authorNickname;
    private int likeCount;
    private int viewCount;
    private int brickCount;
    private List<String> tags;
    private LocalDateTime bookmarkedAt;
    private LocalDateTime createdAt;
    private boolean bookmarked; // Always true for this list, but required by type
}
