package com.brickers.backend.job.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.EnumSet;

/**
 * 레고 생성 작업(Job)
 *
 * - Kids/Pro 전용 (Kids 레벨 1~3 + PRO)
 * - status(큰 상태) + stage(세부 단계)로 진행 표시
 * - DB에는 "메타/포인터"만 저장 (파일 바이너리 저장 X)
 * - 코어 기능 붙으면 stage별 산출물 key/url을 채우고 stage/status 업데이트
 */
@Document(collection = "generate_jobs")
@CompoundIndexes({
        // ✅ 마이페이지 목록/오버뷰에서 userId + 생성시각 desc 조회가 많으므로 인덱스 추천
        @CompoundIndex(name = "ix_user_createdAt", def = "{'userId': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "ix_status_createdAt", def = "{'status': 1, 'createdAt': -1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateJobEntity {

    @Id
    private String id;

    /** 작업 요청자 */
    @Indexed
    private String userId;

    /** Kids 난이도 */
    @Builder.Default
    private KidsLevel level = KidsLevel.LEVEL_1;

    /** 큰 상태 */
    @Builder.Default
    private JobStatus status = JobStatus.QUEUED;

    /** 세부 단계(진행 UI 표시에 사용) */
    @Builder.Default
    private JobStage stage = JobStage.THREE_D_PREVIEW;

    /** 현재 단계가 마지막으로 갱신된 시각 */
    private LocalDateTime stageUpdatedAt;

    /* ========== 입력/메타 ========== */

    /** 입력 이미지 URL(현재는 null 가능) */
    private String sourceImageUrl;

    /** 사용자 표시용 제목(선택) */
    private String title;

    /** 언어 설정 (ko, en, ja) */
    private String language;

    /** Gemini가 추천한 태그 목록 (갤러리 등록 시 사용) */
    private java.util.List<String> suggestedTags;

    /* ========== 산출물 포인터(코어 붙으면 채워짐) ========== */

    /** 3D 프리뷰 이미지 URL 또는 key */
    private String previewImageUrl; // 지금은 url로 둠 (나중에 key로 전환 가능)

    /** 보정된 이미지 URL (나노바나나 보정 결과) */
    private String correctedImageUrl;

    /** GLB 파일 URL (3D 모델) */
    private String glbUrl;

    /** LDR 파일 URL (레고 조립 설명서) */
    private String ldrUrl;

    /** 모델 산출물 key (예: model.glb / model.ldr) - 레거시 호환용 */
    @Deprecated
    private String modelKey;

    /** 도면/PDF key */
    private String blueprintPdfKey;

    /** 조립 설명서 PDF URL (S3) */
    private String instructionsPdfUrl;

    /** BOM JSON key */
    @Deprecated
    private String bomKey;

    /** BOM JSON URL (S3) */
    private String bomUrl;

    /** PDF URL (S3) */
    private String pdfUrl; // [New]

    /** 배경 이미지 URL (Nano Banana 생성) */
    private String backgroundUrl;

    /** 6면 스크린샷 URL 맵 (front, back, left, right, top, bottom) */
    private java.util.Map<String, String> screenshotUrls;

    /** 최종 생성된 브릭 개수 */
    private Integer parts;

    /** 엔진이 시도한 최종 타겟 해상도 */
    private Integer finalTarget;

    /** 실패 시 에러 메시지 */
    private String errorMessage;

    /** 소프트 삭제 여부 (신고 조치 등) */
    @Builder.Default
    private boolean deleted = false;

    /** 신고 접수 여부 (관리자 확인용) */
    @Builder.Default
    private boolean reported = false;

    /** 재시도/재개 요구(선택): 특정 단계부터 다시 수행하고 싶을 때 기록 */
    private JobStage requestedFromStage;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * ✅ 기존 문서 호환 + null 방지
     * - 저장 전에 service에서 호출해주면 안전
     */
    public void ensureDefaults() {
        LocalDateTime now = LocalDateTime.now();

        if (level == null)
            level = KidsLevel.LEVEL_1;
        if (status == null)
            status = JobStatus.QUEUED;
        if (stage == null)
            stage = JobStage.THREE_D_PREVIEW;

        if (createdAt == null)
            createdAt = now;
        if (updatedAt == null)
            updatedAt = now;

        if (stageUpdatedAt == null)
            stageUpdatedAt = now;
    }

    /** ✅ 업데이트 시각 갱신 (service에서 호출) */
    public void touch() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null)
            createdAt = now;
        updatedAt = now;
        if (stageUpdatedAt == null)
            stageUpdatedAt = now;
    }

    /*
     * =========================
     * 상태/단계 변경 helper (선택이지만 추천)
     * =========================
     */

    /** 작업 시작 */
    public void markRunning(JobStage currentStage) {
        this.status = JobStatus.RUNNING;
        if (currentStage != null)
            this.stage = currentStage;
        this.errorMessage = null;
        this.requestedFromStage = null;
        this.stageUpdatedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /** 특정 단계 완료 후 다음 단계로 이동 */
    public void moveToStage(JobStage nextStage) {
        if (nextStage != null)
            this.stage = nextStage;
        this.stageUpdatedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /** 전체 완료 */
    public void markDone() {
        this.status = JobStatus.DONE;
        this.stage = JobStage.DONE;
        this.errorMessage = null;
        this.requestedFromStage = null;
        this.stageUpdatedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /** 실패 처리 */
    public void markFailed(String message) {
        this.status = JobStatus.FAILED;
        this.errorMessage = message;
        this.stageUpdatedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /** 취소 처리(선택) */
    public void markCanceled(String message) {
        if (!canCancel()) {
            throw new IllegalStateException("Cancel not allowed in status=" + status);
        }
        this.status = JobStatus.CANCELED;
        this.errorMessage = message; // 취소 사유를 message에 넣어도 됨(필드 분리도 가능)
        this.stageUpdatedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /** 재시도 요청(코어 붙으면 워커가 이 값 보고 해당 stage부터 재개) */
    public void requestRetry(JobStage fromStage) {
        if (!canRetry()) {
            throw new IllegalStateException("Retry not allowed in status=" + status);
        }
        this.requestedFromStage = (fromStage != null) ? fromStage : this.stage;
        this.status = JobStatus.QUEUED;
        this.stage = this.requestedFromStage;
        this.errorMessage = null;
        this.stageUpdatedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public boolean canRetry() {
        // DONE은 재시도 금지 (결과 덮어쓰기/정산 꼬임 방지)
        return EnumSet.of(JobStatus.FAILED, JobStatus.CANCELED).contains(this.status);
    }

    public boolean canCancel() {
        // QUEUED / RUNNING만 취소 가능
        return EnumSet.of(JobStatus.QUEUED, JobStatus.RUNNING).contains(this.status);
    }
}
