package com.brickers.backend.user.entity;

public enum AccountState {
    ACTIVE, // 정상
    REQUESTED, // 탈퇴 요청(soft delete)
    SUSPENDED // 관리자 정지(추후)
}
