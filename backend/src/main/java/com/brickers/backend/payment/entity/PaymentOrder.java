package com.brickers.backend.payment.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 결제 주문 엔티티
 */
@Document(collection = "payment_orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrder {

    @Id
    private String id;

    // 주문 번호 (외부 노출용, 유니크)
    @Indexed(unique = true)
    private String orderNo;

    // 결제자 ID
    @Indexed
    private String userId;

    // 결제 플랜 정보
    private String planId;
    private String planCode;
    private String planName;

    // 결제 금액
    private BigDecimal amount;

    // 결제 상태
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    // PG사 정보
    private String pgProvider; // toss, kakao, etc.
    private String pgPaymentKey; // PG사 결제 키
    private String pgOrderId; // PG사 주문 ID

    // 결제 URL (checkout 시 발급)
    private String checkoutUrl;

    // 결제 완료 시간
    private LocalDateTime paidAt;

    // 취소/환불 정보
    private LocalDateTime canceledAt;
    private String cancelReason;

    // 생성/수정 시간
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 소프트 삭제 여부 (신고 조치 등)
    @Builder.Default
    private boolean deleted = false;

    public void markCompleted(String pgPaymentKey) {
        this.status = PaymentStatus.COMPLETED;
        this.pgPaymentKey = pgPaymentKey;
        this.paidAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void markCanceled(String reason) {
        this.status = PaymentStatus.CANCELED;
        this.cancelReason = reason;
        this.canceledAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void markRefunded(String reason) {
        this.status = PaymentStatus.REFUNDED;
        this.cancelReason = reason;
        this.canceledAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void markFailed() {
        this.status = PaymentStatus.FAILED;
        this.updatedAt = LocalDateTime.now();
    }

    public boolean canCancelByUser() {
        return this.status == PaymentStatus.PENDING;
    }

    public boolean canCancelByAdmin() {
        return this.status == PaymentStatus.PENDING || this.status == PaymentStatus.COMPLETED;
    }
}
