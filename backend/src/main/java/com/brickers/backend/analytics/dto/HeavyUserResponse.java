package com.brickers.backend.analytics.dto;

public record HeavyUserResponse(
        String userId,
        long eventCount) {
}
