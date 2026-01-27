package com.brickers.backend.audit.entity;

public enum AuditEventType {
    LOGIN,
    LOGOUT,
    LOGOUT_ALL,     // 모든 세션 로그아웃
    FORCE_LOGOUT,   // (ban으로 인한) 강제 로그아웃 체감용 이벤트
    SUSPEND,
    UNSUSPEND,
    SUSPICIOUS_LOGIN  // 비정상 로그인 감지
}
