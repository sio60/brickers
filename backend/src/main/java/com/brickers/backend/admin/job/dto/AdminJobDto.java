package com.brickers.backend.admin.job.dto;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.user.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminJobDto {
    private String id;
    private String userId;
    private UserInfo userInfo;
    private String title;
    private JobStatus status;

    @Data
    @Builder
    public static class UserInfo {
        private String id;
        private String email;
        private String nickname;
        private String profileImage;
    }

    private JobStage stage;
    private String sourceImageUrl;
    private String errorMessage;
    private String previewImageUrl;
    private String correctedImageUrl;
    private String glbUrl;
    private String ldrUrl;
    private String blueprintPdfKey;
    private String instructionsPdfUrl;
    private String bomKey;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime stageUpdatedAt;

    public static AdminJobDto from(GenerateJobEntity job) {
        // ldrUrl 우선, 없으면 레거시 modelKey fallback
        String ldrUrl = job.getLdrUrl();
        if (ldrUrl == null || ldrUrl.isBlank()) {
            ldrUrl = job.getModelKey(); // 레거시 호환
        }

        return AdminJobDto.builder()
                .id(job.getId())
                .userId(job.getUserId())
                .title(job.getTitle())
                .status(job.getStatus())
                .stage(job.getStage())
                .sourceImageUrl(job.getSourceImageUrl())
                .errorMessage(job.getErrorMessage())
                .previewImageUrl(job.getPreviewImageUrl())
                .correctedImageUrl(job.getCorrectedImageUrl())
                .glbUrl(job.getGlbUrl())
                .ldrUrl(ldrUrl)
                .blueprintPdfKey(job.getBlueprintPdfKey())
                .instructionsPdfUrl(job.getInstructionsPdfUrl())
                .bomKey(job.getBomKey())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .stageUpdatedAt(job.getStageUpdatedAt())
                .build();
    }

    public static AdminJobDto from(GenerateJobEntity job, User user) {
        AdminJobDto dto = from(job);
        if (user != null) {
            dto.setUserInfo(UserInfo.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .nickname(user.getNickname())
                    .profileImage(user.getProfileImage())
                    .build());
        }
        return dto;
    }
}
