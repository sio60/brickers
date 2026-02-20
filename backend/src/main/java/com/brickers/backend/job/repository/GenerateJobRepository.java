package com.brickers.backend.job.repository;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStatus;

import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GenerateJobRepository extends MongoRepository<GenerateJobEntity, String> {

        // ✅ 삭제되지 않은 작업만 조회 (사용자 마이페이지용)
        Page<GenerateJobEntity> findByUserIdAndDeletedFalseOrderByCreatedAtDesc(String userId, Pageable pageable);

        // 기존 메소드 (관리자용 - 삭제된 것도 포함)
        Page<GenerateJobEntity> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

        // ✅ 삭제되지 않은 작업 수
        long countByUserIdAndDeletedFalse(String userId);

        long countByUserId(String userId);

        // 완료된 작업 수
        long countByUserIdAndStatus(String userId, JobStatus status);

        // ✅ 삭제되지 않은 작업 중 완료된 작업 수
        long countByUserIdAndStatusAndDeletedFalse(String userId, JobStatus status);

        // [New] 전체 통계용
        long countByStatus(JobStatus status);

        Page<GenerateJobEntity> findByStatusOrderByCreatedAtDesc(JobStatus status, Pageable pageable);

        // ✅ 관리자용: 신고된 작업 필터링
        Page<GenerateJobEntity> findByReportedTrueOrderByCreatedAtDesc(Pageable pageable);

        // ✅ 관리자용: 사용자 검색 + 신고된 작업
        Page<GenerateJobEntity> findByUserIdInAndReportedTrueOrderByCreatedAtDesc(java.util.Collection<String> userIds,
                        Pageable pageable);

        // ✅ 관리자용: 상태 + 신고된 작업
        Page<GenerateJobEntity> findByStatusAndReportedTrueOrderByCreatedAtDesc(JobStatus status, Pageable pageable);

        long countByStatusAndUpdatedAtAfter(JobStatus status, LocalDateTime after);

        // [New] 여러 사용자 ID로 작업 조회 (필터링용)
        Page<GenerateJobEntity> findByUserIdInOrderByCreatedAtDesc(java.util.Collection<String> userIds,
                        Pageable pageable);

        // [New] 여러 사용자 ID + 상태로 작업 조회 (필터링용)
        Page<GenerateJobEntity> findByUserIdInAndStatusOrderByCreatedAtDesc(java.util.Collection<String> userIds,
                        JobStatus status,
                        Pageable pageable);

        // [New] Aggregation for Total Cost (All Time)
        @org.springframework.data.mongodb.repository.Aggregation(pipeline = {
                        "{ '$match': { 'status': 'DONE', 'estCost': { '$exists': true } } }",
                        "{ '$group': { '_id': null, 'total': { '$sum': '$estCost' } } }"
        })
        Double sumTotalEstCost();

        // [New] Aggregation for Total Tokens (All Time)
        @org.springframework.data.mongodb.repository.Aggregation(pipeline = {
                        "{ '$match': { 'status': 'DONE', 'tokenCount': { '$exists': true } } }",
                        "{ '$group': { '_id': null, 'total': { '$sum': '$tokenCount' } } }"
        })
        Long sumTotalTokenCount();

        // [New] Fetch jobs by date range for daily stats calculation
        java.util.List<GenerateJobEntity> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

        long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
