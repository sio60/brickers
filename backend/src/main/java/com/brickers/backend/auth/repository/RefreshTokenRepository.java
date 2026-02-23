package com.brickers.backend.auth.repository;

import com.brickers.backend.auth.entity.RefreshToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends MongoRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    long deleteByExpiresAtBefore(Instant now);

    List<RefreshToken> findByUserId(String userId);

    void deleteByUserId(String userId);

    List<RefreshToken> findByUserIdAndRevokedAtIsNull(String userId);

    long countByUserIdAndRevokedAtIsNull(String userId);
}
