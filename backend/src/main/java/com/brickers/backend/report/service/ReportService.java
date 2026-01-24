package com.brickers.backend.report.service;

import com.brickers.backend.report.dto.ReportCreateRequest;
import com.brickers.backend.report.dto.ReportResolveRequest;
import com.brickers.backend.report.dto.ReportResponse;
import com.brickers.backend.report.entity.Report;
import com.brickers.backend.report.entity.ReportStatus;
import com.brickers.backend.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;

    // --- User Side ---

    public ReportResponse createReport(Authentication auth, ReportCreateRequest req) {
        String userId = (String) auth.getPrincipal();

        // 중복 신고 방지 (같은 대상, 처리되지 않은 신고가 있으면?)
        boolean exists = reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndStatusNot(
                userId, req.getTargetType(), req.getTargetId(), ReportStatus.CANCELED);

        if (exists) {
            throw new IllegalArgumentException("이미 접수된 신고가 있습니다.");
        }

        Report report = Report.builder()
                .reporterId(userId)
                .targetType(req.getTargetType())
                .targetId(req.getTargetId())
                .reason(req.getReason())
                .details(req.getDetails())
                .status(ReportStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return ReportResponse.from(reportRepository.save(report));
    }

    public Page<ReportResponse> getMyReports(Authentication auth, int page, int size) {
        String userId = (String) auth.getPrincipal();
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reportRepository.findByReporterId(userId, pageable).map(ReportResponse::from);
    }

    public ReportResponse getMyReport(Authentication auth, String reportId) {
        String userId = (String) auth.getPrincipal();
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        if (!report.getReporterId().equals(userId)) {
            throw new IllegalArgumentException("본인의 신고만 조회 가능합니다.");
        }
        return ReportResponse.from(report);
    }

    public void cancelMyReport(Authentication auth, String reportId) {
        String userId = (String) auth.getPrincipal();
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        if (!report.getReporterId().equals(userId)) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new IllegalArgumentException("이미 처리된 신고는 취소할 수 없습니다.");
        }

        report.cancel();
        reportRepository.save(report);
    }

    // --- Admin Side ---

    public Page<ReportResponse> getAllReports(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reportRepository.findAll(pageable).map(ReportResponse::from);
    }

    public ReportResponse getReportDetail(String reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));
        // TODO: 여기서 대상(targetType/targetId) 정보를 fetch해서 같이 보여주면 좋음 (나중에 구현)
        return ReportResponse.from(report);
    }

    public ReportResponse resolveReport(Authentication auth, String reportId, ReportResolveRequest req) {
        String adminId = (String) auth.getPrincipal(); // 관리자 ID
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        if (req.isApprove()) {
            report.resolve(adminId, req.getNote());
        } else {
            report.reject(adminId, req.getNote());
        }

        return ReportResponse.from(reportRepository.save(report));
    }

    public void deleteReportTarget(Authentication auth, String reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        String type = report.getTargetType();
        String id = report.getTargetId();

        // TODO: 각 서비스(UserService, GalleryService, etc)를 주입받아 삭제 로직 수행
        // 현재는 로그만 남김
        log.info("Admin deleting target type={}, id={}", type, id);

        // 삭제 성공 후 신고 상태를 RESOLVED로 변경할 수도 있음
        report.resolve((String) auth.getPrincipal(), "대상 삭제 조치");
        reportRepository.save(report);
    }
}
