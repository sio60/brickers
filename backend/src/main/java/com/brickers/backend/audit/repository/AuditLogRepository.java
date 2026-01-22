package com.brickers.backend.audit.repository;

import com.brickers.backend.audit.entity.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
}
