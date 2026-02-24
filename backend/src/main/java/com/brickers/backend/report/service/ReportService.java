package com.brickers.backend.report.service;

import com.brickers.backend.notification.service.UserNotificationService;
import com.brickers.backend.report.dto.ReportCreateRequest;
import com.brickers.backend.report.dto.ReportResolveRequest;
import com.brickers.backend.report.dto.ReportResponse;
import com.brickers.backend.report.entity.Report;
import com.brickers.backend.report.entity.ReportStatus;
import com.brickers.backend.report.entity.ReportTargetType;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * 🚩 ReportService
 * 
 * 신고 도메인의 비즈니스 흐름을 오케스트레이션합니다.
 * 실제 대상 검증 및 물리적 조치는 ReportTargetManager에 위임합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final CurrentUserService currentUserService;
    private final UserNotificationService userNotificationService;

    private final ReportMapper reportMapper;
    private final ReportTargetManager targetManager;

    // --- User Side ---

    @Transactional
    public ReportResponse createReport(Authentication auth, ReportCreateRequest req) {
        User user = currentUserService.get(auth);
        String userId = user.getId();

        validateSpamPrevention(userId, req.getTargetType(), req.getTargetId());

        // 대상 존재 확인 및 플래그 처리 (TargetManager 위임)
        targetManager.validateTargetExistsAndFlag(req.getTargetType(), req.getTargetId());

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

        return reportMapper.toResponse(reportRepository.save(report));
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> getMyReports(Authentication auth, int page, int size) {
        User user = currentUserService.get(auth);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reportRepository.findByReporterId(user.getId(), pageable).map(reportMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ReportResponse getMyReport(Authentication auth, String reportId) {
        User user = currentUserService.get(auth);
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NoSuchElementException("신고를 찾을 수 없습니다."));

        if (!report.getReporterId().equals(user.getId())) {
            throw new IllegalArgumentException("본인의 신고만 조회 가능합니다.");
        }
        return reportMapper.toResponse(report);
    }

    @Transactional
    public void cancelMyReport(Authentication auth, String reportId) {
        User user = currentUserService.get(auth);
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        if (!report.getReporterId().equals(user.getId())) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new IllegalArgumentException("이미 처리된 신고는 취소할 수 없습니다.");
        }

        report.cancel();
        reportRepository.save(report);
    }

    // --- Admin Side ---

    @Transactional(readOnly = true)
    public Page<ReportResponse> getAllReports(int page, int size) {
        Sort sort = Sort.by(Sort.Order.asc("resolvedAt"), Sort.Order.asc("createdAt"));
        Pageable pageable = PageRequest.of(page, size, sort);
        return reportRepository.findAll(pageable).map(reportMapper::toResponse);
    }

    @Transactional
    public ReportResponse resolveReport(Authentication authentication, String reportId, ReportResolveRequest req) {
        User admin = currentUserService.get(authentication);
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "신고를 찾을 수 없습니다."));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(CONFLICT, "이미 처리된 신고입니다.");
        }

        var action = req.getAction();
        var note = req.getNote();

        if (action == ReportResolveRequest.ResolveAction.APPROVE) {
            report.resolve(admin.getId(), note);
        } else if (action == ReportResolveRequest.ResolveAction.REJECT) {
            report.reject(admin.getId(), note);
        } else {
            throw new ResponseStatusException(NOT_FOUND, "Invalid action: " + action);
        }

        Report saved = reportRepository.save(report);
        userNotificationService.notifyReportHandled(
                saved.getReporterId(),
                action == ReportResolveRequest.ResolveAction.APPROVE,
                note);

        return reportMapper.toResponse(saved);
    }

    @Transactional
    public void deleteReportTarget(Authentication auth, String reportId) {
        User admin = currentUserService.get(auth);
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(CONFLICT, "이미 처리된 신고입니다.");
        }

        if (targetManager.isAlreadyDeleted(report.getTargetType(), report.getTargetId())) {
            throw new ResponseStatusException(CONFLICT, "이미 삭제된 대상입니다.");
        }

        // 실제 삭제 수행 (TargetManager 위임)
        String actionDetail = targetManager.performSoftDelete(report.getTargetType(), report.getTargetId());

        report.resolve(admin.getId(), "대상 삭제 조치: " + actionDetail);
        reportRepository.save(report);
    }

    private void validateSpamPrevention(String userId, ReportTargetType type, String targetId) {
        LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
        boolean existsRecently = reportRepository
                .existsByReporterIdAndTargetTypeAndTargetIdAndStatusNotAndCreatedAtAfter(
                        userId, type, targetId, ReportStatus.CANCELED, oneMinuteAgo);

        if (existsRecently) {
            throw new IllegalArgumentException("신고가 너무 빠르게 반복되었습니다. 1분 후 다시 시도해주세요.");
        }
    }
}
