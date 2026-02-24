package com.brickers.backend.audit.service;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.entity.AuditLog;
import com.brickers.backend.audit.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

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
