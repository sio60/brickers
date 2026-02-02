package com.brickers.backend.color.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ColorVariantResponse {
    private boolean ok;
    private String message;

    @JsonProperty("theme_applied")
    private String themeApplied;

    @JsonProperty("original_colors")
    private int originalColors;

    @JsonProperty("changed_bricks")
    private int changedBricks;

    @JsonProperty("ldr_data")
    private String ldrData;  // base64 encoded LDR
}
