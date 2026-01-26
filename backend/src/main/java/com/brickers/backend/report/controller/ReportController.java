package com.brickers.backend.report.controller;

import com.brickers.backend.report.dto.ReportCreateRequest;
import com.brickers.backend.report.dto.ReportResponse;
import com.brickers.backend.report.entity.ReportReason;
import com.brickers.backend.report.service.ReportService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /** 신고 생성 */
    @PostMapping
    public ReportResponse createReport(Authentication authentication, @Valid @RequestBody ReportCreateRequest req) {
        return reportService.createReport(authentication, req);
    }

    /** 내 신고 목록 */
    @GetMapping("/my")
    public Page<ReportResponse> getMyReports(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return reportService.getMyReports(authentication, page, size);
    }

    /** 내 신고 상세 */
    @GetMapping("/my/{reportId}")
    public ReportResponse getMyReport(Authentication authentication, @PathVariable("reportId") String reportId) {
        return reportService.getMyReport(authentication, reportId);
    }

    /** 신고 취소 */
    @DeleteMapping("/my/{reportId}")
    public ResponseEntity<?> cancelMyReport(Authentication authentication, @PathVariable("reportId") String reportId) {
        reportService.cancelMyReport(authentication, reportId);
        return ResponseEntity.ok(Map.of("message", "신고가 취소되었습니다."));
    }

    /** 신고 사유 목록 제공 */
    @GetMapping("/reasons")
    public List<ReportReason> getReportReasons() {
        return Arrays.asList(ReportReason.values());
    }
}
