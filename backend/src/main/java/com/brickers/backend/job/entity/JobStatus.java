package com.brickers.backend.job.entity;

/**
 * 생성 작업의 "큰 상태"
 *
 * QUEUED : 요청은 들어왔지만 아직 처리 시작 전
 * RUNNING : 생성 엔진이 작업 수행 중
 * DONE : 전체 파이프라인 완료(최종 산출물까지 완료)
 * FAILED : 작업 실패(어떤 stage에서 실패했는지는 stage로 확인)
 * CANCELED: (선택) 사용자/시스템에 의해 취소
 */
public enum JobStatus {
    QUEUED,
    RUNNING,
    DONE,
    FAILED,
    CANCELED
}
