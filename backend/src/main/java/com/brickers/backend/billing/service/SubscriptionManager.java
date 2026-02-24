package com.brickers.backend.billing.service;

import com.brickers.backend.billing.entity.Subscription;
import com.brickers.backend.billing.entity.SubscriptionStatus;
import com.brickers.backend.billing.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * 📦 SubscriptionManager
 * 
 * 구독 데이터(DB)의 직접적인 조작(생성, 상태 변경, 만료)을 전담합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionManager {

    private final SubscriptionRepository subscriptionRepository;

    /**
     * 특정 사용자의 활성 구독을 찾아 반환합니다.
     */
    public Optional<Subscription> getActiveSubscription(String userId) {
        return subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE);
    }

    /**
     * 구매 토큰으로 구독 정보를 조회합니다.
     */
    public Optional<Subscription> getByPurchaseToken(String purchaseToken) {
        return subscriptionRepository.findByPurchaseToken(purchaseToken);
    }

    /**
     * 기존 활성 구독을 만료 처리합니다. (중복 구독 방지 등)
     */
    @Transactional
    public void expireExistingSubscription(String userId) {
        getActiveSubscription(userId).ifPresent(existing -> {
            log.info("Expiring existing subscription for user: {}", userId);
            existing.expire();
            subscriptionRepository.save(existing);
        });
    }

    /**
     * 새로운 구독 정보를 저장합니다.
     */
    @Transactional
    public Subscription saveSubscription(Subscription subscription) {
        subscription.setUpdatedAt(LocalDateTime.now());
        return subscriptionRepository.save(subscription);
    }

    /**
     * 구독 상태를 ACTIVE로 강제 변경 (복구/재시작용)
     */
    @Transactional
    public void reactivate(Subscription subscription) {
        if (subscription != null) {
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            saveSubscription(subscription);
        }
    }

    /**
     * 구독 상태를 EXPIRED로 변경 (만료/환불용)
     */
    @Transactional
    public void expire(Subscription subscription) {
        if (subscription != null) {
            subscription.expire();
            saveSubscription(subscription);
        }
    }
}
