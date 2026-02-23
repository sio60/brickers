package com.brickers.backend.admin.controller;

import com.brickers.backend.admin.dto.BlueprintLogDto;
import com.brickers.backend.admin.service.AdminBlueprintService;
import com.brickers.backend.job.entity.JobStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 도안 생성 로그 관리 API (Admin 전용)
 */
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/blueprints")
@RequiredArgsConstructor
public class AdminBlueprintController {

    private final AdminBlueprintService blueprintService;

    /**
     * 도안 생성 로그 조회
     * - 생성 실패 원인 및 AI 개선 패턴 분석용
     */
    @GetMapping("/logs")
    public Page<BlueprintLogDto> getLogs(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "status", required = false) JobStatus status) {
        return blueprintService.getLogs(page, size, status);
    }

    /**
     * 실패한 작업만 조회
     */
    @GetMapping("/logs/failed")
    public Page<BlueprintLogDto> getFailedLogs(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return blueprintService.getFailedLogs(page, size);
    }
}
