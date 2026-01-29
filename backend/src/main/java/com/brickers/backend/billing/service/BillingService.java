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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.Base64;
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
    private final GooglePlayValidator googlePlayValidator;

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

        log.info("Billing checkout started: userId={}, planCode={}, sessionId={}", userId, req.getPlanCode(),
                sessionId);

        return BillingCheckoutResponse.builder()
                .sessionId(sessionId)
                .googleProductId(mapToGoogleProductId(plan.getCode()))
                .planCode(plan.getCode())
                .planName(plan.getName())
                .build();
    }

    @Transactional
    public SubscriptionResponse verify(Authentication auth, BillingVerifyRequest req) {
        String userId = (String) auth.getPrincipal();

        // 1. 중복 검증 방지
        if (subscriptionRepository.findByPurchaseToken(req.getPurchaseToken()).isPresent()) {
            throw new IllegalStateException("이미 처리된 구매입니다.");
        }

        // 2. Google Play 검증 호출 (Mock)
        GooglePlayValidator.GooglePurchaseInfo purchaseInfo = googlePlayValidator.validateSubscription(
                req.getPurchaseToken(), req.getProductId());

        if (!purchaseInfo.isValid()) {
            log.error("Google Play 검증 실패: userId={}, token={}", userId, req.getPurchaseToken());
            throw new IllegalArgumentException("유효하지 않은 결제 정보입니다.");
        }

        // 3. 플랜 정보 조회
        String planCode = mapFromGoogleProductId(req.getProductId());
        planRepository.findByCode(planCode)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 플랜입니다: " + planCode));

        // 4. 기존 활성 구독 만료 처리 (중복 구독 방지)
        subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .ifPresent(existing -> {
                    existing.expire();
                    subscriptionRepository.save(existing);
                });

        // 5. 새 구독 생성
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = purchaseInfo.getExpiresAt();

        Subscription subscription = Subscription.builder()
                .userId(userId)
                .planCode(planCode)
                .status(SubscriptionStatus.ACTIVE)
                .purchaseToken(req.getPurchaseToken())
                .orderId(purchaseInfo.getOrderId())
                .productId(req.getProductId())
                .startedAt(now)
                .expiresAt(expiresAt)
                .autoRenew(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        subscriptionRepository.save(subscription);

        // 6. 사용자 멤버십 업그레이드
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

    @Transactional
    public void cancel(Authentication auth) {
        String userId = (String) auth.getPrincipal();

        Subscription subscription = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("활성 구독이 없습니다."));

        // 상태를 CANCELED로 변경 (자동 갱신 해지)
        // 주의: 멤버십 권한은 expiresAt까지 유지되어야 함
        subscription.cancel();
        subscriptionRepository.save(subscription);

        log.info("Subscription auto-renew canceled: userId={}, subscriptionId={}, expiresAt={}",
                userId, subscription.getId(), subscription.getExpiresAt());
    }

    /**
     * Google Play 웹훅 처리 (RTDN - Real-Time Developer Notifications)
     *
     * notificationType 값:
     * 1: SUBSCRIPTION_RECOVERED - 재개
     * 2: SUBSCRIPTION_RENEWED - 갱신
     * 3: SUBSCRIPTION_CANCELED - 취소
     * 4: SUBSCRIPTION_PURCHASED - 신규 구매
     * 5: SUBSCRIPTION_ON_HOLD - 보류
     * 6: SUBSCRIPTION_IN_GRACE_PERIOD - 유예 기간
     * 7: SUBSCRIPTION_RESTARTED - 재시작
     * 12: SUBSCRIPTION_REVOKED - 취소/환불
     * 13: SUBSCRIPTION_EXPIRED - 만료
     */
    @Transactional
    public void processWebhook(String message) {
        log.info("Google Play webhook received");

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(message);

            // Pub/Sub 메시지 구조: { "message": { "data": "base64...", ... } }
            JsonNode messageNode = root.path("message");
            if (messageNode.isMissingNode()) {
                log.warn("Invalid webhook: missing 'message' field");
                return;
            }

            String encodedData = messageNode.path("data").asText();
            if (encodedData == null || encodedData.isEmpty()) {
                log.warn("Invalid webhook: missing 'data' field");
                return;
            }

            // Base64 디코딩
            String decodedData = new String(Base64.getDecoder().decode(encodedData));
            JsonNode notification = mapper.readTree(decodedData);

            log.info("Decoded RTDN: {}", decodedData);

            // subscriptionNotification 파싱
            JsonNode subNotification = notification.path("subscriptionNotification");
            if (subNotification.isMissingNode()) {
                log.info("Not a subscription notification, skipping");
                return;
            }

            int notificationType = subNotification.path("notificationType").asInt();
            String purchaseToken = subNotification.path("purchaseToken").asText();
            String subscriptionId = subNotification.path("subscriptionId").asText();

            log.info("RTDN: type={}, subscriptionId={}", notificationType, subscriptionId);

            // 구독 조회
            Subscription subscription = subscriptionRepository.findByPurchaseToken(purchaseToken)
                    .orElse(null);

            switch (notificationType) {
                case 1 -> handleRecovered(subscription, purchaseToken); // RECOVERED
                case 2 -> handleRenewed(subscription, subscriptionId); // RENEWED
                case 3 -> handleCanceled(subscription); // CANCELED
                case 4 -> handlePurchased(purchaseToken, subscriptionId); // PURCHASED
                case 7 -> handleRestarted(subscription); // RESTARTED
                case 12 -> handleRevoked(subscription); // REVOKED
                case 13 -> handleExpired(subscription); // EXPIRED
                default -> log.info("Unhandled notification type: {}", notificationType);
            }

        } catch (Exception e) {
            log.error("Webhook processing failed: {}", e.getMessage(), e);
        }
    }

    // ============== RTDN 핸들러 ==============

    /**
     * SUBSCRIPTION_RECOVERED (1) - 결제 실패 후 복구
     */
    private void handleRecovered(Subscription subscription, String purchaseToken) {
        if (subscription == null) {
            log.warn("RECOVERED: subscription not found for purchaseToken={}", purchaseToken);
            return;
        }
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);
        activateMembership(subscription.getUserId());
        log.info("RECOVERED: subscriptionId={}", subscription.getId());
    }

    /**
     * SUBSCRIPTION_RENEWED (2) - 자동 갱신 성공
     */
    private void handleRenewed(Subscription subscription, String subscriptionId) {
        if (subscription == null) {
            log.warn("RENEWED: subscription not found");
            return;
        }

        // 플랜에 따라 만료일 연장
        String planCode = mapFromGoogleProductId(subscriptionId);
        PaymentPlan plan = planRepository.findByCode(planCode).orElse(null);
        if (plan != null) {
            subscription.setExpiresAt(LocalDateTime.now().plusDays(plan.getDurationDays()));
        }
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);
        log.info("RENEWED: subscriptionId={}, newExpiresAt={}", subscription.getId(), subscription.getExpiresAt());
    }

    /**
     * SUBSCRIPTION_CANCELED (3) - 사용자가 취소 (만료일까지는 사용 가능)
     */
    private void handleCanceled(Subscription subscription) {
        if (subscription == null) {
            log.warn("CANCELED: subscription not found");
            return;
        }
        subscription.cancel();
        subscriptionRepository.save(subscription);
        log.info("CANCELED: subscriptionId={}, expiresAt={}", subscription.getId(), subscription.getExpiresAt());
        // 주의: 멤버십은 expiresAt까지 유지 (스케줄러가 만료 처리)
    }

    /**
     * SUBSCRIPTION_PURCHASED (4) - 신규 구매
     * 대부분 verify()에서 처리되지만, 웹훅으로도 올 수 있음
     */
    private void handlePurchased(String purchaseToken, String subscriptionId) {
        // 이미 verify()에서 처리됐는지 확인
        if (subscriptionRepository.findByPurchaseToken(purchaseToken).isPresent()) {
            log.info("PURCHASED: already processed, purchaseToken={}", purchaseToken);
            return;
        }
        // 새 구독은 verify()에서 처리하도록 로그만 남김
        log.info("PURCHASED: new subscription via webhook, subscriptionId={}", subscriptionId);
    }

    /**
     * SUBSCRIPTION_RESTARTED (7) - 일시정지 후 재시작
     */
    private void handleRestarted(Subscription subscription) {
        if (subscription == null) {
            log.warn("RESTARTED: subscription not found");
            return;
        }
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);
        activateMembership(subscription.getUserId());
        log.info("RESTARTED: subscriptionId={}", subscription.getId());
    }

    /**
     * SUBSCRIPTION_REVOKED (12) - 환불/취소로 즉시 종료
     */
    private void handleRevoked(Subscription subscription) {
        if (subscription == null) {
            log.warn("REVOKED: subscription not found");
            return;
        }
        subscription.expire();
        subscriptionRepository.save(subscription);
        deactivateMembership(subscription.getUserId());
        log.info("REVOKED: subscriptionId={}, userId={}", subscription.getId(), subscription.getUserId());
    }

    /**
     * SUBSCRIPTION_EXPIRED (13) - 만료
     */
    private void handleExpired(Subscription subscription) {
        if (subscription == null) {
            log.warn("EXPIRED: subscription not found");
            return;
        }
        subscription.expire();
        subscriptionRepository.save(subscription);
        deactivateMembership(subscription.getUserId());
        log.info("EXPIRED: subscriptionId={}, userId={}", subscription.getId(), subscription.getUserId());
    }

    /**
     * 멤버십 비활성화 (PRO → FREE)
     */
    @Transactional
    public void deactivateMembership(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("deactivateMembership: user not found, userId={}", userId);
            return;
        }

        if (user.getMembershipPlan() == MembershipPlan.PRO) {
            user.setMembershipPlan(MembershipPlan.FREE);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            log.info("Membership deactivated: userId={}, PRO → FREE", userId);
        }
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
