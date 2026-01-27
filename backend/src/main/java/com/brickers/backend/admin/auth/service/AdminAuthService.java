package com.brickers.backend.admin.auth.service;

import com.brickers.backend.auth.refresh.RefreshToken;
import com.brickers.backend.auth.refresh.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * 관리자 인증 관련 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final RefreshTokenRepository refreshTokenRepository;

    /**
     * 특정 유저의 모든 세션 강제 로그아웃
     * - 해당 유저의 모든 RefreshToken을 revoke 처리
     */
    @Transactional
    public void forceLogout(String userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserId(userId);

        if (tokens.isEmpty()) {
            log.info("No active sessions found for user: {}", userId);
            return;
        }

        Instant now = Instant.now();
        for (RefreshToken token : tokens) {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(now);
            }
        }

        refreshTokenRepository.saveAll(tokens);
        log.info("Force logged out user: {}, revoked {} tokens", userId, tokens.size());
    }

    /**
     * 특정 유저의 모든 토큰 삭제 (하드 삭제)
     */
    @Transactional
    public void deleteAllTokens(String userId) {
        refreshTokenRepository.deleteByUserId(userId);
        log.info("Deleted all tokens for user: {}", userId);
    }
}
