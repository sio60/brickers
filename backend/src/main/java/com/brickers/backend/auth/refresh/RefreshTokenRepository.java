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
}
