package com.brickers.backend.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class BrickIssue {
    @JsonProperty("brick_id")
    private Integer brickId;

    @JsonProperty("type")
    private String type;

    @JsonProperty("severity")
    private String severity;

    @JsonProperty("message")
    private String message;

    @JsonProperty("color")
    private String color;

    @JsonProperty("data")
    private Map<String, Object> data;
}
