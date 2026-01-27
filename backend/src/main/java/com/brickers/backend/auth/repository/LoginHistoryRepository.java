package com.brickers.backend.auth.repository;

import com.brickers.backend.auth.entity.LoginHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LoginHistoryRepository extends MongoRepository<LoginHistory, String> {
    Page<LoginHistory> findByUserIdOrderByLoginAtDesc(String userId, Pageable pageable);
}
