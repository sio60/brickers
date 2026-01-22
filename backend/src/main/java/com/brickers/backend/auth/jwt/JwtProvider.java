package com.brickers.backend.auth.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Component
public class JwtProvider {

    private final SecretKey key;
    private final long accessExpMs;

    public JwtProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-expiration}") long accessExpMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpMs = accessExpMs;
    }

    public String createAccessToken(String userId, Map<String, Object> extraClaims) {
        long now = System.currentTimeMillis();
        String jti = java.util.UUID.randomUUID().toString();

        return Jwts.builder()
                .subject(userId)
                .id(jti)
                .claims(extraClaims)
                .issuedAt(new Date(now))
                .expiration(new Date(now + accessExpMs))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Jws<Claims> parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
    }

    public String getUserId(String token) {
        return parse(token).getPayload().getSubject();
    }
}
