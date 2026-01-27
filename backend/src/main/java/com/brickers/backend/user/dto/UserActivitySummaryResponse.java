package com.brickers.backend.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 유저 활동 요약 응답
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivitySummaryResponse {
    private String userId;
    private long postCount;         // 작성한 게시글 수
    private long totalLikes;        // 받은 좋아요 수
    private long totalViews;        // 총 조회수
    private long jobCount;          // 작업 수
    private long completedJobCount; // 완료된 작업 수
}
