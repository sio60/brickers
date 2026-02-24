package com.brickers.backend.billing.service;

import com.brickers.backend.billing.entity.Subscription;
import com.brickers.backend.payment.entity.PaymentPlan;
import com.brickers.backend.payment.repository.PaymentPlanRepository;
import com.brickers.backend.user.service.MembershipService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Base64;

/**
 * 📡 GooglePlayWebhookService
 * 
 * Google Play RTDN(Real-Time Developer Notifications) 수신 및
 * 각 알림 타입별 비즈니스 로직 분기를 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GooglePlayWebhookService {

    private final SubscriptionManager subscriptionManager;
    private final PaymentPlanRepository planRepository;
    private final MembershipService membershipService;
    private final BillingMapper billingMapper;
    private final ObjectMapper objectMapper;

    /**
     * 웹훅 메시지 최상위 파싱 및 분기
     */
    @Transactional
    public void processWebhook(String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            JsonNode messageNode = root.path("message");
            if (messageNode.isMissingNode())
                return;

            String encodedData = messageNode.path("data").asText();
            if (encodedData == null || encodedData.isEmpty())
                return;

            String decodedData = new String(Base64.getDecoder().decode(encodedData));
            JsonNode notification = objectMapper.readTree(decodedData);
            log.info("Decoded RTDN Webhook: {}", decodedData);

            JsonNode subNotification = notification.path("subscriptionNotification");
            if (subNotification.isMissingNode())
                return;

            int notificationType = subNotification.path("notificationType").asInt();
            String purchaseToken = subNotification.path("purchaseToken").asText();
            String productId = subNotification.path("subscriptionId").asText();

            Subscription subscription = subscriptionManager.getByPurchaseToken(purchaseToken).orElse(null);

            switch (notificationType) {
                case 1 -> handleRecovered(subscription, purchaseToken);
                case 2 -> handleRenewed(subscription, productId);
                case 3 -> handleCanceled(subscription);
                case 7 -> handleRestarted(subscription);
                case 12, 13 -> handleExpiredOrRevoked(subscription, notificationType);
                default -> log.info("Notification type {} ignored for now", notificationType);
            }
        } catch (Exception e) {
            log.error("Failed to process Google Play Webhook", e);
        }
    }

    private void handleRecovered(Subscription sub, String token) {
        if (sub == null)
            return;
        subscriptionManager.reactivate(sub);
        membershipService.upgradeToPro(sub.getUserId());
        log.info("RTDN [RECOVERED]: Subscription reactivated for user {}", sub.getUserId());
    }

    private void handleRenewed(Subscription sub, String productId) {
        if (sub == null)
            return;
        String planCode = billingMapper.mapFromGoogleProductId(productId);
        PaymentPlan plan = planRepository.findByCode(planCode).orElse(null);

        if (plan != null) {
            sub.setExpiresAt(LocalDateTime.now().plusDays(plan.getDurationDays()));
            subscriptionManager.saveSubscription(sub);
            log.info("RTDN [RENEWED]: Expiry extended for subscription {}", sub.getId());
        }
    }

    private void handleCanceled(Subscription sub) {
        if (sub == null)
            return;
        sub.cancel();
        subscriptionManager.saveSubscription(sub);
        log.info("RTDN [CANCELED]: Auto-renew disabled for subscription {}", sub.getId());
    }

    private void handleRestarted(Subscription sub) {
        if (sub == null)
            return;
        subscriptionManager.reactivate(sub);
        membershipService.upgradeToPro(sub.getUserId());
        log.info("RTDN [RESTARTED]: Subscription resumed for user {}", sub.getUserId());
    }

    private void handleExpiredOrRevoked(Subscription sub, int type) {
        if (sub == null)
            return;
        subscriptionManager.expire(sub);
        membershipService.applyMembership(sub.getUserId(), "FREE");
        log.info("RTDN [{}]: Membership revoked for user {}", (type == 12 ? "REVOKED" : "EXPIRED"), sub.getUserId());
    }
}
