package com.brickers.backend.auth.dto;

import com.brickers.backend.audit.entity.AuditLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginHistoryResponse {
    private String id;
    private String eventType;
    private String ip;
    private String userAgent;
    private LocalDateTime createdAt;

    public static LoginHistoryResponse from(AuditLog log) {
        return LoginHistoryResponse.builder()
                .id(log.getId())
                .eventType(log.getEventType().name())
                .ip(log.getIp())
                .userAgent(log.getUserAgent())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
