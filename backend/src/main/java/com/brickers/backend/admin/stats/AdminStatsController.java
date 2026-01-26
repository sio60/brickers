package com.brickers.backend.admin.stats;

import com.brickers.backend.admin.stats.dto.DailyStatsDto;
import com.brickers.backend.admin.stats.dto.JobStatsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final AdminStatsService statsService;

    /** 유저 가입자 통계 (기간별) */
    @GetMapping("/users")
    public List<DailyStatsDto> getUserStats(@RequestParam(defaultValue = "30") int days) {
        return statsService.getUserGrowthStats(days);
    }

    /** AI Job 통계 */
    @GetMapping("/jobs")
    public JobStatsDto getJobStats() {
        return statsService.getJobStats();
    }

    /** 매출 통계 (기간별) */
    @GetMapping("/revenue")
    public List<DailyStatsDto> getRevenueStats(@RequestParam(defaultValue = "30") int days) {
        return statsService.getRevenueStats(days);
    }
}
