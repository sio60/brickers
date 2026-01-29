package com.brickers.backend.report.repository;

import com.brickers.backend.report.entity.Report;
import com.brickers.backend.report.entity.ReportReason;
import com.brickers.backend.report.entity.ReportStatus;
import com.brickers.backend.report.entity.ReportTargetType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface ReportRepository extends MongoRepository<Report, String> {

    // 내 신고 목록
    Page<Report> findByReporterId(String reporterId, Pageable pageable);

    // 전체 목록 (관리자용 - 상태 필터링 등 필요 시 쿼리 메소드 추가)
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);

    // 복합 조건 검색 예시
    Page<Report> findByTargetTypeAndStatus(ReportTargetType targetType, ReportStatus status, Pageable pageable);

    // ✅ 1분 내 중복 신고 방지 (연타/재시도 방어)
    boolean existsByReporterIdAndTargetTypeAndTargetIdAndStatusNotAndCreatedAtAfter(
            String reporterId,
            ReportTargetType targetType,
            String targetId,
            ReportStatus status,
            LocalDateTime createdAt);
}
