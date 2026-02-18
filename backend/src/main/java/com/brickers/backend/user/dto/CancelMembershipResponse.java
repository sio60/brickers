package com.brickers.backend.user.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CancelMembershipResponse {
    private boolean success;
    private String message;
}
