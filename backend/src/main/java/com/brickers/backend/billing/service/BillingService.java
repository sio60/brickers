package com.brickers.backend.billing.service;

import com.brickers.backend.billing.dto.*;
import com.brickers.backend.billing.entity.Subscription;
import com.brickers.backend.billing.entity.SubscriptionStatus;
import com.brickers.backend.billing.repository.SubscriptionRepository;
import com.brickers.backend.payment.entity.PaymentPlan;
import com.brickers.backend.payment.repository.PaymentPlanRepository;
import com.brickers.backend.user.service.MembershipService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final MembershipService membershipService;
    private final GooglePlayValidator googlePlayValidator;

    // 신규 분리된 서비스들
    private final BillingMapper billingMapper;
    private final SubscriptionManager subscriptionManager;
    private final GooglePlayWebhookService webhookService;

    /**
     * 요금제 목록 조회
     */
    public List<BillingPlanResponse> getPlans() {
        return planRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(billingMapper::toPlanResponse)
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

        String sessionId = "BIL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("Billing checkout started: userId={}, planCode={}, sessionId={}", userId, req.getPlanCode(),
                sessionId);

        return BillingCheckoutResponse.builder()
                .sessionId(sessionId)
                .googleProductId(billingMapper.mapToGoogleProductId(plan.getCode()))
                .planCode(plan.getCode())
                .planName(plan.getName())
                .build();
    }

    /**
     * 구매 영수증 검증 및 구독 생성
     */
    @Transactional
    public SubscriptionResponse verify(Authentication auth, BillingVerifyRequest req) {
        String userId = (String) auth.getPrincipal();

        // 1. 중복 검증 방계
        if (subscriptionManager.getByPurchaseToken(req.getPurchaseToken()).isPresent()) {
            throw new IllegalStateException("이미 처리된 구매입니다.");
        }

        // 2. Google Play 검증 (Mock)
        GooglePlayValidator.GooglePurchaseInfo purchaseInfo = googlePlayValidator.validateSubscription(
                req.getPurchaseToken(), req.getProductId());

        if (!purchaseInfo.isValid()) {
            throw new IllegalArgumentException("유효하지 않은 결제 정보입니다.");
        }

        // 3. 플랜 확인 및 기존 구독 만료
        String planCode = billingMapper.mapFromGoogleProductId(req.getProductId());
        subscriptionManager.expireExistingSubscription(userId);

        // 4. 새 구독 생성
        Subscription subscription = Subscription.builder()
                .userId(userId)
                .planCode(planCode)
                .status(SubscriptionStatus.ACTIVE)
                .purchaseToken(req.getPurchaseToken())
                .orderId(purchaseInfo.getOrderId())
                .productId(req.getProductId())
                .startedAt(LocalDateTime.now())
                .expiresAt(purchaseInfo.getExpiresAt())
                .autoRenew(true)
                .build();

        subscriptionManager.saveSubscription(subscription);

        // 5. 멤버십 업그레이드 (MembershipService 위임)
        membershipService.upgradeToPro(userId);

        return billingMapper.toSubscriptionResponse(subscription);
    }

    /**
     * 결제 이력 조회
     */
    public Page<BillingHistoryResponse> getHistory(Authentication auth, int page, int size) {
        String userId = (String) auth.getPrincipal();
        return subscriptionRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(BillingHistoryResponse::from);
    }

    /**
     * 자동 갱신 취소
     */
    @Transactional
    public void cancel(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        Subscription subscription = subscriptionManager.getActiveSubscription(userId)
                .orElseThrow(() -> new IllegalStateException("활성 구독이 없습니다."));

        subscription.cancel();
        subscriptionManager.saveSubscription(subscription);
        log.info("Subscription canceled: userId={}, subscriptionId={}", userId, subscription.getId());
    }

    /**
     * Google Play 웹훅 처리 (전용 서비스로 위임)
     */
    @Transactional
    public void processWebhook(String message) {
        webhookService.processWebhook(message);
    }

    /**
     * 현재 구독 상태 조회
     */
    public SubscriptionResponse getCurrentSubscription(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        return subscriptionManager.getActiveSubscription(userId)
                .map(billingMapper::toSubscriptionResponse)
                .orElse(null);
    }
}
