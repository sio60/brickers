package com.brickers.backend.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class JudgeResponse {
    @JsonProperty("model_name")
    private String modelName;

    @JsonProperty("brick_count")
    private int brickCount;

    @JsonProperty("score")
    private int score;

    @JsonProperty("stable")
    private boolean stable;

    @JsonProperty("issues")
    private List<BrickIssue> issues;

    @JsonProperty("brick_colors")
    private Map<String, String> brickColors;

    @JsonProperty("elapsed_ms")
    private double elapsedMs;

    @JsonProperty("backend")
    private String backend;

    @JsonProperty("ldr_content")
    private String ldrContent;
}
