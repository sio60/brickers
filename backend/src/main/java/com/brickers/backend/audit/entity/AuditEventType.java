package com.brickers.backend.audit.entity;

public enum AuditEventType {
    LOGIN,
    LOGOUT,
    FORCE_LOGOUT,   // (ban으로 인한) 강제 로그아웃 체감용 이벤트
    SUSPEND,
    UNSUSPEND
}
