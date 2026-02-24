package com.brickers.backend.sqs.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * SQS 메시지 공통 구조
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class SqsMessage {

    /**
     * 메시지 타입
     */
    public enum MessageType {
        REQUEST, // Backend → AI Server (작업 요청)
        RESULT // AI Server → Backend (작업 결과)
    }

    private MessageType type;
    private String jobId;
    private LocalDateTime timestamp;

    // REQUEST 필드
    private String userId;
    private String sourceImageUrl;
    private String age;
    private Integer budget;
    private String language; // [New]
    private String sourceType; // "image" | "drawing" | "prompt"

    // RESULT 필드
    private Boolean success;
    private String correctedUrl;
    private String glbUrl;
    private String ldrUrl;
    private String initialLdrUrl; // [New]
    private String bomUrl;
    private String pdfUrl; // [New] PDF URL
    private String backgroundUrl; // Background image URL (Nano Banana)
    private Integer parts;
    private Integer finalTarget;
    private List<String> tags;
    private String errorMessage;
    private Double estCost; // [New]
    private Integer tokenCount; // [New]
    private Integer stabilityScore; // [New]
}
