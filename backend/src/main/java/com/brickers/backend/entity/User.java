package com.brickers.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사용자 엔티티 (MongoDB)
 * 소셜 로그인 사용자 정보 저장
 */
@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    // 소셜 로그인 제공자 (kakao, google)
    private String provider;

    // 소셜 로그인 제공자의 사용자 ID
    @Indexed(unique = true)
    private String providerId;

    // 사용자 정보
    private String email;
    private String nickname;
    private String profileImage;

    // 생성/수정 시간
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
