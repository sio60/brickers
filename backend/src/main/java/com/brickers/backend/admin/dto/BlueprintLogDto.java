package com.brickers.backend.admin.dto;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.KidsLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 도안 생성 로그 DTO (실패 원인 분석용)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlueprintLogDto {
    private String jobId;
    private String userId;
    private KidsLevel level;
    private JobStatus status;
    private JobStage stage;
    private String errorMessage;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime stageUpdatedAt;

    public static BlueprintLogDto from(GenerateJobEntity job) {
        return BlueprintLogDto.builder()
                .jobId(job.getId())
                .userId(job.getUserId())
                .level(job.getLevel())
                .status(job.getStatus())
                .stage(job.getStage())
                .errorMessage(job.getErrorMessage())
                .title(job.getTitle())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .stageUpdatedAt(job.getStageUpdatedAt())
                .build();
    }
}
