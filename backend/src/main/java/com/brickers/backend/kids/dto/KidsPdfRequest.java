package com.brickers.backend.kids.dto;

import lombok.Data;
import java.util.List;

@Data
public class KidsPdfRequest {
    private String modelName;
    private String ldrUrl;
    private String jobId; // DB 업데이트용
    private String coverImage; // Base64
    private List<StepImageItem> steps;

    @Data
    public static class StepImageItem {
        private int stepIndex;
        private List<String> images; // Base64 list
    }
}
