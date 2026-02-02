package com.brickers.backend.color.dto;

import lombok.Data;

@Data
public class ColorVariantResponse {
    private boolean ok;
    private String message;
    private String themeApplied;
    private int originalColors;
    private int changedBricks;
    private String ldrData;  // base64 encoded LDR
}
