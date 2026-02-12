package com.brickers.backend.admin.judge.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class JudgeResponse {
    private String modelName;
    private int brickCount;
    private int score;
    private boolean stable;
    private List<BrickIssue> issues;
    private Map<Integer, String> brickColors;
    private double elapsedMs;
    private String backend;
    private String ldrContent;
}
