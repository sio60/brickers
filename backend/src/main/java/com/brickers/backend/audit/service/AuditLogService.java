package com.brickers.backend.audit.service;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.entity.AuditLog;
import com.brickers.backend.audit.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    /**
     * 공통 감사 로그 저장
     * - tokenId: (우선) JWT jti -> (없으면) 세션ID -> (없으면) null
     * - request가 null이면 ip/userAgent/tokenId 없이 저장
     */
    public void log(
            AuditEventType type,
            String targetUserId,
            String actorUserId,
            HttpServletRequest request,
            Map<String, Object> meta) {
        String ip = null;
        String ua = null;
        if (request != null) {
            ip = extractClientIp(request);
            ua = request.getHeader("User-Agent");
        }

        AuditLog doc = AuditLog.builder()
                .eventType(type)
                .targetUserId(targetUserId)
                .actorUserId(actorUserId)
                .ip(ip)
                .userAgent(ua)
                .createdAt(LocalDateTime.now())
                .meta(meta)
                .build();

        auditLogRepository.save(doc);
    }

    /**
     * Authorization 헤더에서 JWT jti 추출
     * - 서명검증까지는 여기서 하지 않음(감사 로그 목적)
     * - payload를 base64url 디코드해서 "jti"만 뽑음
     */
    private String extractJwtJti(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || auth.isBlank())
            return null;

        if (!auth.startsWith("Bearer "))
            return null;
        String token = auth.substring("Bearer ".length()).trim();
        if (token.isBlank())
            return null;

        // JWT: header.payload.signature
        String[] parts = token.split("\\.");
        if (parts.length < 2)
            return null;

        try {
            String payloadJson = new String(
                    Base64.getUrlDecoder().decode(parts[1]),
                    StandardCharsets.UTF_8);

            // ✅ 아주 단순하게 "jti":"..." 만 뽑기 (외부 lib 없이)
            // payloadJson 예: {"sub":"...","jti":"abc","exp":...}
            String key = "\"jti\"";
            int idx = payloadJson.indexOf(key);
            if (idx < 0)
                return null;

            int colon = payloadJson.indexOf(":", idx);
            if (colon < 0)
                return null;

            int firstQuote = payloadJson.indexOf("\"", colon);
            if (firstQuote < 0)
                return null;

            int secondQuote = payloadJson.indexOf("\"", firstQuote + 1);
            if (secondQuote < 0)
                return null;

            String jti = payloadJson.substring(firstQuote + 1, secondQuote).trim();
            return jti.isBlank() ? null : jti;

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 프록시 환경 고려
     */
    private String extractClientIp(HttpServletRequest request) {
        // 1) Cloudflare
        String cf = request.getHeader("CF-Connecting-IP");
        if (cf != null && !cf.isBlank())
            return cf.trim();

        // 2) 표준 (프록시 체인: "client, proxy1, proxy2")
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank())
            return xff.split(",")[0].trim();

        // 3) Nginx 등
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank())
            return realIp.trim();

        // 4) 최후
        return request.getRemoteAddr();
    }
}
