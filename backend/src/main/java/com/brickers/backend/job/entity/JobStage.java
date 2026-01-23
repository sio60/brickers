package com.brickers.backend.job.entity;

/**
 * 생성 작업의 "세부 단계(stage)"
 *
 * THREE_D_PREVIEW : 3D 사진/프리뷰(미리보기 이미지 등) 생성 단계
 * MODEL : 레고 모델(ldr/glb 등) 생성 단계
 * BLUEPRINT : 도면/설명서/PDF 생성 단계
 * DONE : 모든 산출물 생성 완료(표시용)
 */
public enum JobStage {
    THREE_D_PREVIEW,
    MODEL,
    BLUEPRINT,
    DONE
}
