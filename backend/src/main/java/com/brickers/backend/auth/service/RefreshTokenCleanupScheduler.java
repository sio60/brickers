package com.brickers.backend.auth.service;

import com.brickers.backend.auth.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class RefreshTokenCleanupScheduler {

    private final RefreshTokenRepository refreshTokenRepository;

    // 매일 새벽 3시 (서버 타임존 기준)
    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupExpiredTokens() {
        long deleted = refreshTokenRepository.deleteByExpiresAtBefore(Instant.now());
        if (deleted > 0) {
            log.info("[RefreshTokenCleanup] deleted expired tokens: {}", deleted);
        }
    }
}
