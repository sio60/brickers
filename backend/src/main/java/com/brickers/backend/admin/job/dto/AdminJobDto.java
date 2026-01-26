package com.brickers.backend.admin.job.dto;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.JobStage;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminJobDto {
    private String id;
    private String userId;
    private String title;
    private JobStatus status;
    private JobStage stage;
    private String sourceImageUrl;
    private String errorMessage;
    private String previewImageUrl;
    private String modelKey;
    private String blueprintPdfKey;
    private String bomKey;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime stageUpdatedAt;

    public static AdminJobDto from(GenerateJobEntity job) {
        return AdminJobDto.builder()
                .id(job.getId())
                .userId(job.getUserId())
                .title(job.getTitle())
                .status(job.getStatus())
                .stage(job.getStage())
                .sourceImageUrl(job.getSourceImageUrl())
                .errorMessage(job.getErrorMessage())
                .previewImageUrl(job.getPreviewImageUrl())
                .modelKey(job.getModelKey())
                .blueprintPdfKey(job.getBlueprintPdfKey())
                .bomKey(job.getBomKey())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .stageUpdatedAt(job.getStageUpdatedAt())
                .build();
    }
}
