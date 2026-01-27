package com.brickers.backend.admin.stats.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyStatsDto {
    private LocalDate date;
    private long count;
    private long totalAmount; // For Revenue
}
