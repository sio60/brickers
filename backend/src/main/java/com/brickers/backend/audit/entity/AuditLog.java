package com.brickers.backend.audit.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    private String id;

    private AuditEventType eventType;

    // 대상 유저(이벤트가 적용되는 사용자)
    private String targetUserId;

    // 행위자(관리자 또는 본인). 본인 행동이면 actorUserId=targetUserId로 넣어도 됨
    private String actorUserId;

    // 요청 정보(감사 목적)
    private String ip;
    private String userAgent;

    private LocalDateTime createdAt;

    // 추가 메타(정지 사유, provider 등)
    private Map<String, Object> meta;
}
