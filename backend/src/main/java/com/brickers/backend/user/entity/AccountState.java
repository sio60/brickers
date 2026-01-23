package com.brickers.backend.user.entity;

public enum AccountState {
    ACTIVE, // 정상 사용자
    REQUESTED, // 탈퇴 요청 (유예/대기)
    DELETED, // 탈퇴 완료 (soft delete)
    SUSPENDED // 관리자 정지/밴
}