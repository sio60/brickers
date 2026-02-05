package com.brickers.backend.kids.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AgentLogRequest {
    @NotBlank
    @Size(max = 100)
    private String step;

    @Size(max = 2000)
    private String message;
}
