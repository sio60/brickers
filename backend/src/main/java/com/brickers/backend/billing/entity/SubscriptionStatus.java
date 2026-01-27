package com.brickers.backend.billing.entity;

/**
 * 구독 상태
 */
public enum SubscriptionStatus {
    PENDING,    // 결제 대기
    ACTIVE,     // 활성 (구독 중)
    CANCELED,   // 취소됨 (만료일까지 사용 가능)
    EXPIRED,    // 만료됨
    PAUSED      // 일시정지 (Google Play 기능)
}
