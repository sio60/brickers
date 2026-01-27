package com.brickers.backend.user.dto;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.KidsLevel;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MyJobResponse {

    private String id;

    private KidsLevel level;

    private JobStatus status;
    private JobStage stage;

    private String title;
    private String sourceImageUrl;

    private String previewImageUrl;

    /** 보정 이미지 URL */
    private String correctedImageUrl;

    /** GLB 파일 URL */
    private String glbUrl;

    /** LDR 파일 URL */
    private String ldrUrl;

    /** 결과물 존재 여부(모델/도면/BOM 중 하나라도 있으면 true) */
    private boolean hasResult;

    /** 실패 메시지(FAILED일 때 표시용) */
    private String errorMessage;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime stageUpdatedAt;

    public static MyJobResponse from(GenerateJobEntity j) {
        // ldrUrl 우선, 없으면 레거시 modelKey fallback
        String ldrUrl = j.getLdrUrl();
        if (ldrUrl == null || ldrUrl.isBlank()) {
            ldrUrl = j.getModelKey(); // 레거시 호환
        }

        boolean hasResult = (ldrUrl != null && !ldrUrl.isBlank())
                || (j.getGlbUrl() != null && !j.getGlbUrl().isBlank())
                || (j.getBlueprintPdfKey() != null && !j.getBlueprintPdfKey().isBlank())
                || (j.getBomKey() != null && !j.getBomKey().isBlank());

        return MyJobResponse.builder()
                .id(j.getId())
                .level(j.getLevel())
                .status(j.getStatus())
                .stage(j.getStage())
                .title(j.getTitle())
                .sourceImageUrl(j.getSourceImageUrl())
                .previewImageUrl(j.getPreviewImageUrl())
                .correctedImageUrl(j.getCorrectedImageUrl())
                .glbUrl(j.getGlbUrl())
                .ldrUrl(ldrUrl)
                .hasResult(hasResult)
                .errorMessage(j.getErrorMessage())
                .createdAt(j.getCreatedAt())
                .updatedAt(j.getUpdatedAt())
                .stageUpdatedAt(j.getStageUpdatedAt())
                .build();
    }
}
