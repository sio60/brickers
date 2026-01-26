package com.brickers.backend.admin.report;

import com.brickers.backend.report.dto.ReportResolveRequest;
import com.brickers.backend.report.dto.ReportResponse;
import com.brickers.backend.report.service.ReportService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final ReportService reportService;

    /** 전체 신고 목록 (관리자) */
    @GetMapping
    public Page<ReportResponse> getAllReports(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return reportService.getAllReports(page, size);
    }

    /** 신고 상세 (관리자) */
    @GetMapping("/{reportId}")
    public ReportResponse getReportDetail(@PathVariable("reportId") String reportId) {
        return reportService.getReportDetail(reportId);
    }

    /** 신고 처리(승인/반려) */
    @PostMapping("/{reportId}/resolve")
    public ReportResponse resolveReport(
            Authentication authentication,
            @PathVariable("reportId") String reportId,
            @Valid @RequestBody ReportResolveRequest req) {
        return reportService.resolveReport(authentication, reportId, req);
    }

    /** 신고 대상 삭제 */
    @DeleteMapping("/{reportId}/target")
    public ResponseEntity<?> deleteTarget(
            Authentication authentication,
            @PathVariable("reportId") String reportId) {
        reportService.deleteReportTarget(authentication, reportId);
        return ResponseEntity.ok(Map.of("message", "대상이 삭제 처리되었습니다."));
    }
}
