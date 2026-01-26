package com.brickers.backend.job.repository;

import com.brickers.backend.job.entity.GenerateJobEntity;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.brickers.backend.job.entity.JobStatus;

public interface GenerateJobRepository extends MongoRepository<GenerateJobEntity, String> {

    Page<GenerateJobEntity> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    long countByUserId(String userId);

    // [New] 전체 통계용
    long countByStatus(JobStatus status);

    Page<GenerateJobEntity> findByStatusOrderByCreatedAtDesc(JobStatus status, Pageable pageable);

    long countByStatusAndUpdatedAtAfter(JobStatus status, LocalDateTime after);
}
