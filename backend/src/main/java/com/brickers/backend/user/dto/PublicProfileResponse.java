package com.brickers.backend.user.dto;

import com.brickers.backend.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 공개 프로필 응답
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicProfileResponse {
    private String id;
    private String nickname;
    private String profileImage;
    private String bio;
    private String membershipPlan;
    private LocalDateTime createdAt;

    public static PublicProfileResponse from(User user) {
        return PublicProfileResponse.builder()
                .id(user.getId())
                .nickname(user.getNickname())
                .profileImage(user.getProfileImage())
                .bio(user.getBio())
                .membershipPlan(user.getMembershipPlan() != null ? user.getMembershipPlan().name() : "FREE")
                .createdAt(user.getCreatedAt())
                .build();
    }
}
