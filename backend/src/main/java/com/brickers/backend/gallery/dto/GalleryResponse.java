package com.brickers.backend.gallery.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.brickers.backend.gallery.entity.Visibility;

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
    private String ldrUrl;
    private String sourceImageUrl;
    private String glbUrl;
    private Integer parts;
    private Map<String, String> screenshotUrls;
    private boolean isPro;

    private Visibility visibility;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ✅ 추가: 좋아요/싫어요/조회수
    private long likeCount;
    private long dislikeCount;
    private long viewCount;
    private long commentCount; // Added field

    // ✅ 추가: 현재 사용자의 북마크/반응 상태
    private Boolean bookmarked;
    private String myReaction; // "LIKE", "DISLIKE", 또는 null
}
