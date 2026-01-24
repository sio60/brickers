package com.brickers.backend.report.service;

import com.brickers.backend.report.dto.ReportCreateRequest;
import com.brickers.backend.report.dto.ReportResolveRequest;
import com.brickers.backend.report.dto.ReportResponse;
import com.brickers.backend.report.entity.Report;
import com.brickers.backend.report.entity.ReportStatus;
import com.brickers.backend.report.repository.ReportRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final CurrentUserService currentUserService; // ✅ 추가

    // --- User Side ---

    public ReportResponse createReport(Authentication auth, ReportCreateRequest req) {
        User user = currentUserService.get(auth);
        String userId = user.getId();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneMinuteAgo = now.minusMinutes(1);

        // ✅ 1분 내 + CANCELED 제외 중복 신고 차단
        boolean existsRecently = reportRepository
                .existsByReporterIdAndTargetTypeAndTargetIdAndStatusNotAndCreatedAtAfter(
                        userId,
                        req.getTargetType(),
                        req.getTargetId(),
                        ReportStatus.CANCELED,
                        oneMinuteAgo);

        if (existsRecently) {
            throw new IllegalArgumentException("신고가 너무 빠르게 반복되었습니다. 1분 후 다시 시도해주세요.");
        }

        Report report = Report.builder()
                .reporterId(userId)
                .targetType(req.getTargetType())
                .targetId(req.getTargetId())
                .reason(req.getReason())
                .details(req.getDetails())
                .status(ReportStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return ReportResponse.from(reportRepository.save(report));
    }

    public Page<ReportResponse> getMyReports(Authentication auth, int page, int size) {
        User user = currentUserService.get(auth);
        String userId = user.getId();

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reportRepository.findByReporterId(userId, pageable).map(ReportResponse::from);
    }

    public ReportResponse getMyReport(Authentication auth, String reportId) {
        User user = currentUserService.get(auth);
        String userId = user.getId();

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        if (!report.getReporterId().equals(userId)) {
            throw new IllegalArgumentException("본인의 신고만 조회 가능합니다.");
        }
        return ReportResponse.from(report);
    }

    public void cancelMyReport(Authentication auth, String reportId) {
        User user = currentUserService.get(auth);
        String userId = user.getId();

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
        return ReportResponse.from(report);
    }

    public ReportResponse resolveReport(Authentication auth, String reportId, ReportResolveRequest req) {
        User admin = currentUserService.get(auth);
        String adminId = admin.getId();

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
        User admin = currentUserService.get(auth);
        String adminId = admin.getId();

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        String type = report.getTargetType();
        String id = report.getTargetId();

        log.info("Admin deleting target type={}, id={}", type, id);

        report.resolve(adminId, "대상 삭제 조치");
        reportRepository.save(report);
    }
}
