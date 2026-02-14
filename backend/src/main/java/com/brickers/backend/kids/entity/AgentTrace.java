package com.brickers.backend.kids.entity;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@Document(collection = "agent_traces")
public class AgentTrace {
    @Id
    private String id;

    @Indexed
    private String jobId;

    private String step; // e.g., "GENERATE", "VERIFY"
    private String nodeName; // e.g., "node_generator", "node_verifier"
    private String status; // "START", "SUCCESS", "FAILURE", "RETRY"
    private Long durationMs; // Execution time in milliseconds

    private Map<String, Object> input;
    private Map<String, Object> output;

    private String message; // Simple log message (optional)

    @Indexed
    private LocalDateTime createdAt;
}
