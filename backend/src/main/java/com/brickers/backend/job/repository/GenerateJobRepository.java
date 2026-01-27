package com.brickers.backend.job.repository;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GenerateJobRepository extends MongoRepository<GenerateJobEntity, String> {

    Page<GenerateJobEntity> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    long countByUserId(String userId);

    // 완료된 작업 수
    long countByUserIdAndStatus(String userId, JobStatus status);
}
