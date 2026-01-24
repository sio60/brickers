package com.brickers.backend.report.repository;

import com.brickers.backend.report.entity.Report;
import com.brickers.backend.report.entity.ReportReason;
import com.brickers.backend.report.entity.ReportStatus;
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
    Page<Report> findByTargetTypeAndStatus(String targetType, ReportStatus status, Pageable pageable);

    // 중복 신고 방지를 위한 조회
    boolean existsByReporterIdAndTargetTypeAndTargetIdAndStatusNot(
            String reporterId, String targetType, String targetId, ReportStatus status);

}
