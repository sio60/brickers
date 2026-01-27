package com.brickers.backend.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenStatusResponse {
    private boolean accessValid;
    private boolean refreshValid;
    private long activeSessions;
}
