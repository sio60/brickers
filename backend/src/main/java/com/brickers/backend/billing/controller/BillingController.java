package com.brickers.backend.billing.controller;

import com.brickers.backend.billing.dto.*;
import com.brickers.backend.billing.scheduler.SubscriptionScheduler;
import com.brickers.backend.billing.service.BillingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;
    private final SubscriptionScheduler subscriptionScheduler;

    /**
     * 요금제 조회
     * GET /api/billing/plans
     */
    @GetMapping("/plans")
    public List<BillingPlanResponse> getPlans() {
        return billingService.getPlans();
    }

    /**
     * 결제 시작 (세션 생성)
     * POST /api/billing/checkout
     */
    @PostMapping("/checkout")
    public BillingCheckoutResponse checkout(Authentication auth, @RequestBody BillingCheckoutRequest req) {
        return billingService.checkout(auth, req);
    }

    /**
     * 결제 검증 (Google Play 구매 확인)
     * POST /api/billing/verify
     */
    @PostMapping("/verify")
    public SubscriptionResponse verify(Authentication auth, @RequestBody BillingVerifyRequest req) {
        return billingService.verify(auth, req);
    }

    /**
     * 멤버십 적용 (PRO 권한 반영)
     * POST /api/billing/activate
     */
    @PostMapping("/activate")
    public ResponseEntity<?> activate(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        billingService.activateMembership(userId);
        return ResponseEntity.ok(Map.of("message", "멤버십이 활성화되었습니다."));
    }

    /**
     * 결제 성공 확인 (멤버십 변경)
     * POST /api/billing/confirm
     * - verify와 동일한 역할, 프론트 편의용 alias
     */
    @PostMapping("/confirm")
    public SubscriptionResponse confirm(Authentication auth, @RequestBody BillingVerifyRequest req) {
        return billingService.verify(auth, req);
    }

    /**
     * 결제 내역 조회
     * GET /api/billing/history
     */
    @GetMapping("/history")
    public Page<BillingHistoryResponse> getHistory(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return billingService.getHistory(auth, page, size);
    }

    /**
     * 구독 취소
     * POST /api/billing/cancel
     */
    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(Authentication auth) {
        billingService.cancel(auth);
        return ResponseEntity.ok(Map.of("message", "구독이 취소되었습니다. 만료일까지 서비스를 이용할 수 있습니다."));
    }

    /**
     * Google Play 웹훅 (RTDN)
     * POST /api/billing/webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(@RequestBody String message) {
        billingService.processWebhook(message);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /**
     * 현재 구독 상태 조회
     * GET /api/billing/current
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentSubscription(Authentication auth) {
        SubscriptionResponse sub = billingService.getCurrentSubscription(auth);
        if (sub == null) {
            return ResponseEntity.ok(Map.of("subscribed", false));
        }
        return ResponseEntity.ok(sub);
    }

    // ============== 테스트용 (개발 환경에서만 사용) ==============

    /**
     * 만료 스케줄러 수동 실행 (테스트용)
     * POST /api/billing/test/expire
     */
    @PostMapping("/test/expire")
    public ResponseEntity<?> testExpireScheduler() {
        subscriptionScheduler.processExpiredSubscriptions();
        return ResponseEntity.ok(Map.of("message", "스케줄러 실행 완료"));
    }

    /**
     * 웹훅 테스트용 (테스트용)
     * POST /api/billing/test/webhook
     */
    @PostMapping("/test/webhook")
    public ResponseEntity<?> testWebhook(@RequestBody String message) {
        billingService.processWebhook(message);
        return ResponseEntity.ok(Map.of("message", "웹훅 처리 완료"));
    }
}
