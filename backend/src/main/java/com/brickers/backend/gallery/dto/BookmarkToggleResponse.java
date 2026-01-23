package com.brickers.backend.gallery.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BookmarkToggleResponse {
    private String postId;
    private boolean bookmarked; // true=추가, false=해제
    private LocalDateTime toggledAt; // 토글 시각
}