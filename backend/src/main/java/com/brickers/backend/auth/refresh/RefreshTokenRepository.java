package com.brickers.backend.auth.refresh;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends MongoRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    long deleteByExpiresAtBefore(Instant now);

    // Admin 강제 로그아웃용
    List<RefreshToken> findByUserId(String userId);

    void deleteByUserId(String userId);

    // 유저의 모든 활성 refresh 토큰 조회 (logout-all 용)
    List<RefreshToken> findByUserIdAndRevokedAtIsNull(String userId);

    // 유저의 활성 토큰 수 조회
    long countByUserIdAndRevokedAtIsNull(String userId);
}
