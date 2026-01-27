package com.brickers.backend.billing.repository;

import com.brickers.backend.billing.entity.Subscription;
import com.brickers.backend.billing.entity.SubscriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends MongoRepository<Subscription, String> {

    // 사용자의 현재 활성 구독 조회
    Optional<Subscription> findByUserIdAndStatus(String userId, SubscriptionStatus status);

    // 사용자의 모든 구독 이력
    Page<Subscription> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    // 사용자의 최신 구독
    Optional<Subscription> findFirstByUserIdOrderByCreatedAtDesc(String userId);

    // Google Play 구매 토큰으로 조회
    Optional<Subscription> findByPurchaseToken(String purchaseToken);

    // Google Play 주문 ID로 조회
    Optional<Subscription> findByOrderId(String orderId);

    // 만료 예정 구독 목록 (자동 갱신 알림용)
    List<Subscription> findByStatusAndAutoRenewTrue(SubscriptionStatus status);

    // 만료된 구독 조회 (스케줄러용) - 현재 시간 이전에 만료되어야 할 ACTIVE/CANCELED 구독
    List<Subscription> findByStatusInAndExpiresAtBefore(List<SubscriptionStatus> statuses, java.time.LocalDateTime expiresAt);

    // Google Play orderId로 조회 (RTDN 웹훅용)
    java.util.Optional<Subscription> findByProductIdAndPurchaseToken(String productId, String purchaseToken);
}
