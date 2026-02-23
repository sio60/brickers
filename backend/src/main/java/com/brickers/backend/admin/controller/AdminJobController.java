package com.brickers.backend.admin.controller;

import com.brickers.backend.admin.dto.AdminJobDto;
import com.brickers.backend.admin.service.AdminJobService;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/jobs")
@RequiredArgsConstructor
public class AdminJobController {

    private final AdminJobService adminJobService;

    /** 전체 작업 목록 */
    @GetMapping
    public Page<AdminJobDto> getAllJobs(
            @RequestParam(name = "status", required = false) JobStatus status,
            @RequestParam(name = "userSearch", required = false) String userSearch,
            @RequestParam(name = "reported", required = false) Boolean reported,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return adminJobService.getAllJobs(status, userSearch, reported, page, size);
    }

    /** 작업 상세 */
    @GetMapping("/{jobId}")
    public AdminJobDto getJob(@PathVariable("jobId") String jobId) {
        return adminJobService.getJob(jobId);
    }

    /** 작업 로그 조회 (DB 상태 기반) */
    @GetMapping("/{jobId}/logs")
    public ResponseEntity<?> getJobLogs(@PathVariable("jobId") String jobId) {
        return ResponseEntity.ok(adminJobService.getJobLogs(jobId));
    }

    /** 작업 재시도 */
    @PostMapping("/{jobId}/retry")
    public AdminJobDto retryJob(
            @PathVariable("jobId") String jobId,
            @RequestBody(required = false) Map<String, String> body) {
        JobStage fromStage = null;

        if (body != null && body.get("fromStage") != null) {
            try {
                fromStage = JobStage.valueOf(body.get("fromStage"));
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid fromStage: " + body.get("fromStage"));
            }
        }

        return adminJobService.retryJob(jobId, fromStage);
    }

    /** 작업 취소 */
    @PostMapping("/{jobId}/cancel")
    public AdminJobDto cancelJob(@PathVariable("jobId") String jobId) {
        return adminJobService.cancelJob(jobId);
    }
}
