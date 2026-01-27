package com.brickers.backend.admin.metrics;

import com.brickers.backend.admin.metrics.dto.MetricsDto;
import com.brickers.backend.admin.metrics.service.AdminMetricsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 트래픽/메트릭 통계 API (Admin 전용)
 */
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/metrics")
@RequiredArgsConstructor
public class AdminMetricsController {

    private final AdminMetricsService metricsService;

    /**
     * 요청/에러 통계 조회
     */
    @GetMapping
    public MetricsDto getMetrics() {
        return metricsService.getMetrics();
    }
}
