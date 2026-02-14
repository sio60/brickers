package com.brickers.backend.notification.repository;

import com.brickers.backend.notification.entity.UserNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserNotificationRepository extends MongoRepository<UserNotification, String> {
    Page<UserNotification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}
