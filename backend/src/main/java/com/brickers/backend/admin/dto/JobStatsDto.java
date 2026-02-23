package com.brickers.backend.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JobStatsDto {
    private long totalJobs;
    private long successCount;
    private long failedCount;
    private double successRate;
    private double failedRate;
}
