package com.brickers.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import com.brickers.backend.auth.jwt.JwtProvider;
import com.brickers.backend.auth.refresh.RefreshToken;
import com.brickers.backend.auth.refresh.RefreshTokenRepository;
import com.brickers.backend.auth.refresh.TokenHash;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthTokenService {

    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpMs;

    @Value("${app.cookie.secure:true}") // 기본값 true (보안 권장)
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}") // 기본값 Lax (같은 도메인 권장)
    private String cookieSameSite;

    public IssuedTokens issueTokens(String userId, Map<String, Object> claims) {
        String accessToken = jwtProvider.createAccessToken(userId, claims);

        String refreshRaw = UUID.randomUUID() + "-" + UUID.randomUUID();
        String hash = TokenHash.sha256(refreshRaw);

        Instant now = Instant.now();
        Instant exp = now.plusMillis(refreshExpMs);

        refreshTokenRepository.save(
                RefreshToken.builder()
                        .userId(userId)
                        .tokenHash(hash)
                        .createdAt(now)
                        .expiresAt(exp)
                        .revokedAt(null)
                        .build());

        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", refreshRaw)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .sameSite(cookieSameSite) // 배포 환경: Lax/true 권장
                .maxAge(refreshExpMs / 1000)
                .build();

        return new IssuedTokens(accessToken, refreshCookie);
    }

    /**
     * refreshToken(쿠키) 검증 + rotation
     * 1) 기존 refresh 폐기
     * 2) userId 반환 (컨트롤러가 새 refresh+access 발급)
     */
    public String validateAndRotate(String refreshRaw) {
        if (refreshRaw == null || refreshRaw.isBlank())
            throw new IllegalStateException("no refresh");

        String hash = TokenHash.sha256(refreshRaw);

        RefreshToken rt = refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash)
                .orElseThrow(() -> new IllegalStateException("refresh invalid"));

        if (rt.getExpiresAt().isBefore(Instant.now())) {
            rt.setRevokedAt(Instant.now());
            refreshTokenRepository.save(rt);
            throw new IllegalStateException("refresh expired");
        }

        // ✅ rotation: 기존 refresh 폐기
        rt.setRevokedAt(Instant.now());
        refreshTokenRepository.save(rt);

        return rt.getUserId();
    }

    public void revokeRefresh(String refreshRaw) {
        if (refreshRaw == null || refreshRaw.isBlank())
            return;

        String hash = TokenHash.sha256(refreshRaw);
        refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash).ifPresent(rt -> {
            rt.setRevokedAt(Instant.now());
            refreshTokenRepository.save(rt);
        });
    }

    public ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .sameSite(cookieSameSite)
                .maxAge(0)
                .build();
    }

    public record IssuedTokens(String accessToken, ResponseCookie refreshCookie) {
    }
}
