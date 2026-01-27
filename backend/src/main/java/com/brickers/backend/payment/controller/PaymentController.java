package com.brickers.backend.payment.controller;

import com.brickers.backend.payment.dto.*;
import com.brickers.backend.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /** 결제 가능한 플랜 목록 */
    @GetMapping("/plans")
    public List<PaymentPlanResponse> getPlans() {
        return paymentService.getAvailablePlans();
    }

    /** 결제 요청 생성 및 결제 URL 발급 */
    @PostMapping("/checkout")
    public PaymentOrderResponse checkout(Authentication auth, @RequestBody PaymentCheckoutRequest req) {
        return paymentService.createCheckout(auth, req);
    }

    /** 결제 주문 상태 조회 */
    @GetMapping("/orders/{orderId}")
    public PaymentOrderResponse getOrder(Authentication auth, @PathVariable("orderId") String orderId) {
        return paymentService.getOrder(auth, orderId);
    }

    /** 결제 취소 요청 */
    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(Authentication auth, @PathVariable("orderId") String orderId) {
        paymentService.cancelOrder(auth, orderId);
        return ResponseEntity.ok(Map.of("message", "결제 취소 요청이 처리되었습니다."));
    }

    /** 내 결제 내역 조회 */
    @GetMapping("/my/history")
    public Page<PaymentOrderResponse> getMyHistory(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return paymentService.getMyHistory(auth, page, size);
    }

    /** 결제 웹훅 (PG사 전용) */
    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(@RequestBody PaymentWebhookRequest req) {
        paymentService.processWebhook(req);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
