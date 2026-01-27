package com.brickers.backend.audit.repository;

import com.brickers.backend.audit.entity.AuditEventType;
import com.brickers.backend.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    // 유저의 특정 이벤트 타입 로그 조회 (최근순)
    List<AuditLog> findByTargetUserIdAndEventTypeInOrderByCreatedAtDesc(
            String targetUserId, List<AuditEventType> eventTypes, Pageable pageable);

    // 유저의 모든 로그 조회
    Page<AuditLog> findByTargetUserIdOrderByCreatedAtDesc(String targetUserId, Pageable pageable);
}
