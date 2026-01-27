package com.brickers.backend.admin.stats.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 다운로드 분석 DTO (무료 vs 유료)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DownloadStatsDto {
    private long totalDownloads;
    private long freeDownloads; // 무료(광고 시청)
    private long paidDownloads; // 유료
    private double freeRatio; // 무료 비율 (%)
    private double paidRatio; // 유료 비율 (%)
}
