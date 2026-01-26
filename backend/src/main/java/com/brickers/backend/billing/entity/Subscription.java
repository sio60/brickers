package com.brickers.backend.billing.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * 구독 정보 엔티티
 * 사용자의 PRO 멤버십 구독 상태 관리
 */
@Document(collection = "subscriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {

    @Id
    private String id;

    @Indexed
    private String userId;

    // 플랜 코드 (PRO_MONTHLY, PRO_YEARLY)
    private String planCode;

    // 구독 상태
    private SubscriptionStatus status;

    // Google Pay 관련
    private String purchaseToken;      // Google Play 구매 토큰
    private String orderId;            // Google Play 주문 ID
    private String productId;          // Google Play 상품 ID

    // 구독 기간
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;
    private LocalDateTime canceledAt;

    // 자동 갱신 여부
    @Builder.Default
    private Boolean autoRenew = true;

    // 생성/수정 시간
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public boolean isActive() {
        return status == SubscriptionStatus.ACTIVE
            && expiresAt != null
            && expiresAt.isAfter(LocalDateTime.now());
    }

    public void activate(LocalDateTime expiresAt) {
        this.status = SubscriptionStatus.ACTIVE;
        this.startedAt = LocalDateTime.now();
        this.expiresAt = expiresAt;
        this.updatedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = SubscriptionStatus.CANCELED;
        this.canceledAt = LocalDateTime.now();
        this.autoRenew = false;
        this.updatedAt = LocalDateTime.now();
    }

    public void expire() {
        this.status = SubscriptionStatus.EXPIRED;
        this.updatedAt = LocalDateTime.now();
    }
}
