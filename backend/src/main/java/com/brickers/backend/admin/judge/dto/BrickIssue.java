package com.brickers.backend.admin.judge.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.util.Map;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class BrickIssue {
    private Integer brickId;
    private String type;
    private String severity;
    private String message;
    private String color;
    private Map<String, Object> data;
}
