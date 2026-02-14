package com.brickers.backend.kids.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AgentLogRequest {
    @NotBlank
    @Size(max = 100)
    private String step; // e.g., "GENERATE"

    @Size(max = 2000)
    private String message;

    // --- Added for Trace System ---
    private String nodeName; // e.g., "node_generator"
    private String status; // "START", "SUCCESS", "FAILURE", "RETRY"
    private Long durationMs;

    private java.util.Map<String, Object> input;
    private java.util.Map<String, Object> output;
}
