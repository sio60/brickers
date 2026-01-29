package com.brickers.backend.billing.service;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Google Play Developer API 검증 시뮬레이터 (Mock)
 * 실제 Google API 호출 대신 내부 로직으로 검증 결과 반환
 */
@Component
@Slf4j
public class GooglePlayValidator {

    @Getter
    @Builder
    public static class GooglePurchaseInfo {
        private String orderId;
        private String productId;
        private String purchaseToken;
        private LocalDateTime expiresAt;
        private boolean isValid;
    }

    /**
     * 구매 토큰 검증
     *
     * @param purchaseToken 프론트엔드에서 전달받은 토큰
     * @param productId     상품 ID
     * @return 검증 결과 및 기간 정보
     */
    public GooglePurchaseInfo validateSubscription(String purchaseToken, String productId) {
        log.info("[GooglePlayValidator] 검증 시도: productId={}, token={}", productId, purchaseToken);

        // 실제로는 Google API 호출: AndroidPublisher.Purchases.Subscriptions.get()

        // 시뮬레이션: 'invalid'로 시작하는 토큰은 실패 처리
        if (purchaseToken == null || purchaseToken.startsWith("invalid")) {
            log.warn("[GooglePlayValidator] 검증 실패: 유효하지 않은 토큰");
            return GooglePurchaseInfo.builder()
                    .isValid(false)
                    .build();
        }

        // 성공 시나리오 (기본 30일 구독 부여)
        LocalDateTime expiresAt = LocalDateTime.now();
        if ("brickers_pro_yearly".equals(productId)) {
            expiresAt = expiresAt.plusYears(1);
        } else {
            expiresAt = expiresAt.plusMonths(1);
        }

        log.info("[GooglePlayValidator] 검증 성공: expiresAt={}", expiresAt);

        return GooglePurchaseInfo.builder()
                .isValid(true)
                .orderId("GPA." + System.currentTimeMillis() % 10000)
                .productId(productId)
                .purchaseToken(purchaseToken)
                .expiresAt(expiresAt)
                .build();
    }
}
