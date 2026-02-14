package com.brickers.backend.analytics.dto;

public record DailyTrendResponse(
        String date,
        long count) {
}
