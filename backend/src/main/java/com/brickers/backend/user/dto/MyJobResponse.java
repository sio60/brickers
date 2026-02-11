package com.brickers.backend.user.dto;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.entity.KidsLevel;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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

    /** 조립 설명서 PDF URL */
    private String instructionsPdfUrl;

    /** 결과물 존재 여부(모델/도면/BOM 중 하나라도 있으면 true) */
    private boolean hasResult;

    /** 실패 메시지(FAILED일 때 표시용) */
    private String errorMessage;

    /** Gemini가 추천한 태그 목록 */
    private List<String> suggestedTags;

    /** 최종 생성된 브릭 개수 */
    private Integer parts;

    /** 엔진이 시도한 최종 타겟 해상도 */
    private Integer finalTarget;

    /** 6면 스크린샷 URL 맵 */
    private Map<String, String> screenshotUrls;

    /** PRO 모드 여부 (보통 1000개 이상) */
    private boolean isPro;

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
                || (j.getInstructionsPdfUrl() != null && !j.getInstructionsPdfUrl().isBlank());

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
                .instructionsPdfUrl(j.getInstructionsPdfUrl())
                .hasResult(hasResult)
                .errorMessage(j.getErrorMessage())
                .suggestedTags(j.getSuggestedTags())
                .screenshotUrls(j.getScreenshotUrls())
                .parts(j.getParts())
                .finalTarget(j.getFinalTarget())
                .isPro(j.getParts() != null && j.getParts() >= 1000)
                .createdAt(j.getCreatedAt())
                .updatedAt(j.getUpdatedAt())
                .stageUpdatedAt(j.getStageUpdatedAt())
                .build();
    }
}
