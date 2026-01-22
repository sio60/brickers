package com.brickers.backend.auth.refresh;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "refresh_tokens")
public class RefreshToken {

    @Id
    private String id;

    // users 컬렉션의 _id(String) 또는 네가 쓰는 유저 식별자
    private String userId;

    // 원문 refreshToken 저장 금지(유출 대비) → hash만 저장
    private String tokenHash;

    private Instant createdAt;

    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt;

    // null이면 유효, 값 있으면 폐기됨(로그아웃/회전/강제 만료)
    private Instant revokedAt;
}
