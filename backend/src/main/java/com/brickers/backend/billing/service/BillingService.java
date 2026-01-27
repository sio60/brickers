package com.brickers.backend.billing.service;

import com.brickers.backend.billing.dto.*;
import com.brickers.backend.billing.entity.Subscription;
import com.brickers.backend.billing.entity.SubscriptionStatus;
import com.brickers.backend.billing.repository.SubscriptionRepository;
import com.brickers.backend.payment.entity.PaymentPlan;
import com.brickers.backend.payment.repository.PaymentPlanRepository;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillingService {

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentPlanRepository planRepository;
    private final UserRepository userRepository;

    /**
     * 요금제 목록 조회
     */
    public List<BillingPlanResponse> getPlans() {
        return planRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(BillingPlanResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 결제 세션 생성 (Google Play 결제 시작 전)
     */
    @Transactional
    public BillingCheckoutResponse checkout(Authentication auth, BillingCheckoutRequest req) {
        String userId = (String) auth.getPrincipal();

        PaymentPlan plan = planRepository.findByCode(req.getPlanCode())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 플랜입니다: " + req.getPlanCode()));

        // 세션 ID 생성 (프론트에서 결제 완료 후 verify 시 사용)
        String sessionId = "BIL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        log.info("Billing checkout started: userId={}, planCode={}, sessionId={}", userId, req.getPlanCode(), sessionId);

        return BillingCheckoutResponse.builder()
                .sessionId(sessionId)
                .googleProductId(mapToGoogleProductId(plan.getCode()))
                .planCode(plan.getCode())
                .planName(plan.getName())
                .build();
    }

    /**
     * Google Play 결제 검증 및 구독 생성
     */
    @Transactional
    public SubscriptionResponse verify(Authentication auth, BillingVerifyRequest req) {
        String userId = (String) auth.getPrincipal();

        // 중복 검증 방지
        if (subscriptionRepository.findByPurchaseToken(req.getPurchaseToken()).isPresent()) {
            throw new IllegalStateException("이미 처리된 구매입니다.");
        }

        // TODO: Google Play Developer API로 실제 검증
        // AndroidPublisher.Purchases.Subscriptions.get() 호출
        // 지금은 프론트에서 넘어온 값 신뢰 (개발/테스트용)
        log.warn("Google Play 검증 스킵 (개발 모드): purchaseToken={}", req.getPurchaseToken());

        // 플랜 정보 조회
        String planCode = mapFromGoogleProductId(req.getProductId());
        PaymentPlan plan = planRepository.findByCode(planCode)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 플랜입니다: " + planCode));

        // 기존 활성 구독 만료 처리
        subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .ifPresent(existing -> {
                    existing.expire();
                    subscriptionRepository.save(existing);
                });

        // 새 구독 생성
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusDays(plan.getDurationDays());

        Subscription subscription = Subscription.builder()
                .userId(userId)
                .planCode(planCode)
                .status(SubscriptionStatus.ACTIVE)
                .purchaseToken(req.getPurchaseToken())
                .orderId(req.getOrderId())
                .productId(req.getProductId())
                .startedAt(now)
                .expiresAt(expiresAt)
                .autoRenew(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        subscriptionRepository.save(subscription);

        // 사용자 멤버십 업그레이드
        activateMembership(userId);

        log.info("Subscription created: userId={}, planCode={}, expiresAt={}", userId, planCode, expiresAt);

        return SubscriptionResponse.from(subscription);
    }

    /**
     * 멤버십 활성화 (PRO 권한 부여)
     */
    @Transactional
    public void activateMembership(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        user.setMembershipPlan(MembershipPlan.PRO);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Membership activated: userId={}, plan=PRO", userId);
    }

    /**
     * 결제 이력 조회
     */
    public Page<BillingHistoryResponse> getHistory(Authentication auth, int page, int size) {
        String userId = (String) auth.getPrincipal();
        Pageable pageable = PageRequest.of(page, size);
        return subscriptionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(BillingHistoryResponse::from);
    }

    /**
     * 구독 취소
     */
    @Transactional
    public void cancel(Authentication auth) {
        String userId = (String) auth.getPrincipal();

        Subscription subscription = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("활성 구독이 없습니다."));

        // TODO: Google Play Developer API로 구독 취소 요청
        // 실제로는 Google Play에서 자동 갱신 취소 처리

        subscription.cancel();
        subscriptionRepository.save(subscription);

        log.info("Subscription canceled: userId={}, subscriptionId={}", userId, subscription.getId());
        // 주의: 취소해도 expiresAt까지는 PRO 유지
    }

    /**
     * Google Play 웹훅 처리 (RTDN - Real-Time Developer Notifications)
     */
    @Transactional
    public void processWebhook(String message) {
        // TODO: Google Play RTDN 메시지 파싱 및 처리
        // - SUBSCRIPTION_PURCHASED: 신규 구매
        // - SUBSCRIPTION_RENEWED: 자동 갱신
        // - SUBSCRIPTION_CANCELED: 취소
        // - SUBSCRIPTION_EXPIRED: 만료
        log.info("Google Play webhook received: {}", message);
    }

    /**
     * 현재 구독 상태 조회
     */
    public SubscriptionResponse getCurrentSubscription(Authentication auth) {
        String userId = (String) auth.getPrincipal();

        return subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .map(SubscriptionResponse::from)
                .orElse(null);
    }

    // Google Play 상품 ID 매핑
    private String mapToGoogleProductId(String planCode) {
        return switch (planCode) {
            case "PRO_MONTHLY" -> "brickers_pro_monthly";
            case "PRO_YEARLY" -> "brickers_pro_yearly";
            default -> null;
        };
    }

    private String mapFromGoogleProductId(String productId) {
        return switch (productId) {
            case "brickers_pro_monthly" -> "PRO_MONTHLY";
            case "brickers_pro_yearly" -> "PRO_YEARLY";
            default -> throw new IllegalArgumentException("알 수 없는 상품 ID: " + productId);
        };
    }
}
