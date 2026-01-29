package com.brickers.backend.payment.service;

import com.brickers.backend.billing.dto.*;
import com.brickers.backend.billing.service.GooglePlayValidator;
import com.brickers.backend.payment.dto.*;
import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.entity.PaymentPlan;
import com.brickers.backend.payment.entity.PaymentStatus;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
import com.brickers.backend.payment.repository.PaymentPlanRepository;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentPlanRepository planRepository;
    private final PaymentOrderRepository orderRepository;
    private final UserRepository userRepository;
    private final GooglePlayValidator googlePlayValidator;

    /** 요금제 목록 조회 */
    public List<PaymentPlanResponse> getAvailablePlans() {
        return planRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(PaymentPlanResponse::from)
                .collect(Collectors.toList());
    }

    /** 결제 요청 생성 (주문 생성) */
    @Transactional
    public PaymentOrderResponse createCheckout(Authentication auth, PaymentCheckoutRequest req) {
        String userId = (String) auth.getPrincipal();

        PaymentPlan plan = planRepository.findById(req.getPlanId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 플랜입니다."));

        // 유니크한 주문 번호 생성
        String orderNo = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        PaymentOrder order = PaymentOrder.builder()
                .orderNo(orderNo)
                .userId(userId)
                .planId(plan.getId())
                .planCode(plan.getCode())
                .planName(plan.getName())
                .amount(plan.getPrice())
                .status(PaymentStatus.PENDING)
                // ✅ 웹 결제 시 주문 확인 URL (실제 PG사 연동 시 PG사에서 발급받은 URL로 대체)
                // 현재는 인앱 결제(Google Pay/BillingService) 사용으로 checkoutUrl 미사용
                .checkoutUrl("/api/payments/orders/" + orderNo + "/status")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return PaymentOrderResponse.from(orderRepository.save(order));
    }

    /** 결제 상태 조회 */
    public PaymentOrderResponse getOrder(Authentication auth, String orderId) {
        String userId = (String) auth.getPrincipal();
        PaymentOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));

        if (!order.getUserId().equals(userId)) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }

        return PaymentOrderResponse.from(order);
    }

    /** 결제 취소 요청 */
    @Transactional
    public void cancelOrder(Authentication auth, String orderId) {
        String userId = (String) auth.getPrincipal();
        PaymentOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));

        if (!order.getUserId().equals(userId)) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }

        if (!order.canCancelByUser()) {
            throw new IllegalStateException("취소 가능한 상태가 아닙니다.");
        }

        order.markCanceled("사용자 요청 취소");
        orderRepository.save(order);
    }

    /** 내 결제 내역 조회 */
    public Page<PaymentOrderResponse> getMyHistory(Authentication auth, int page, int size) {
        String userId = (String) auth.getPrincipal();
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return orderRepository.findByUserId(userId, pageable).map(PaymentOrderResponse::from);
    }

    /** 결제 웹훅 처리 (PG사 결과 수신) */
    @Transactional
    public void processWebhook(PaymentWebhookRequest req) {
        // PG사 주문 ID 등을 기반으로 주문 조회
        PaymentOrder order = orderRepository.findByPgOrderId(req.getPgOrderId())
                .orElseThrow(() -> new IllegalArgumentException("해당 주문을 찾을 수 없습니다: " + req.getPgOrderId()));

        // ✅ 상태 검증: 이미 처리된 주문인지 확인
        if (order.getStatus() != PaymentStatus.PENDING) {
            log.warn("Webhook for already processed order: orderNo={}, status={}",
                    order.getOrderNo(), order.getStatus());
            return;
        }

        // ✅ 금액 검증 (PG사에서 받은 금액과 주문 금액 일치 확인)
        if (req.getAmount() != null && !req.getAmount().equals(order.getAmount())) {
            log.error("Amount mismatch! expected={}, received={}, orderNo={}",
                    order.getAmount(), req.getAmount(), order.getOrderNo());
            order.markFailed();
            orderRepository.save(order);
            throw new IllegalStateException("결제 금액 불일치");
        }

        // ✅ PG사 상태값 처리
        if ("SUCCESS".equals(req.getStatus()) || "COMPLETED".equals(req.getStatus())
                || "DONE".equals(req.getStatus())) {
            order.markCompleted(req.getPaymentKey());
            applyMembership(order.getUserId(), order.getPlanCode());
            log.info("Payment completed: orderNo={}, userId={}", order.getOrderNo(), order.getUserId());
        } else if ("FAILED".equals(req.getStatus()) || "CANCELED".equals(req.getStatus())) {
            order.markFailed();
            log.warn("Payment failed: orderNo={}, status={}", order.getOrderNo(), req.getStatus());
        } else {
            log.warn("Unknown payment status: {}, orderNo={}", req.getStatus(), order.getOrderNo());
        }

        orderRepository.save(order);
    }

    /** 멤버십 적용 로직 (내부) */
    private void applyMembership(String userId, String planCode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // planCode에 따라 멤버십 플랜 변경
        if (planCode != null && planCode.toUpperCase().contains("PRO")) {
            user.setMembershipPlan(MembershipPlan.PRO);
        }
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Membership applied: User={} ({}), Plan={}", userId, user.getNickname(), planCode);
    }

    /** 멤버십 적용 (외부/관리자 호출용) */
    @Transactional
    public void applyMembershipPublic(ApplyMembershipRequest req) {
        applyMembership(req.getUserId(), req.getPlanCode());
        log.info("Membership applied via internal API: userId={}, planCode={}",
                req.getUserId(), req.getPlanCode());
    }

    @SuppressWarnings("unchecked")
    @Transactional
    public PaymentOrder verifyGooglePay(Authentication auth, GooglePayVerifyRequest req) {
        String userId = (String) auth.getPrincipal();

        log.info("Google Pay verification request: User={}, Data={}", userId, req.getPaymentData());

        // 1. Google Pay Token 추출
        String googlePaymentToken = null;
        try {
            Map<String, Object> paymentData = req.getPaymentData();
            if (paymentData != null) {
                Map<String, Object> paymentMethodData = (Map<String, Object>) paymentData.get("paymentMethodData");
                if (paymentMethodData != null) {
                    Map<String, Object> tokenizationData = (Map<String, Object>) paymentMethodData
                            .get("tokenizationData");
                    if (tokenizationData != null) {
                        googlePaymentToken = (String) tokenizationData.get("token");
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract Google Pay token", e);
        }

        if (googlePaymentToken == null) {
            throw new IllegalArgumentException("결제 토큰을 찾을 수 없습니다.");
        }

        // 2. Google Play Validator로 검증 (Mock)
        // Google Pay로 결제하더라도 최종 결과는 Google Play Developer API와 연동되어야 함
        // 여기서는 예시로 PRO_MONTHLY 상품에 대해 검증 진행
        GooglePlayValidator.GooglePurchaseInfo purchaseInfo = googlePlayValidator.validateSubscription(
                googlePaymentToken, "brickers_pro_monthly");

        if (!purchaseInfo.isValid()) {
            log.error("Google Pay 검증 실패: userId={}, token={}", userId, googlePaymentToken);
            throw new IllegalArgumentException("유효하지 않은 결제 토큰입니다.");
        }

        // 3. 주문 기록 생성
        String orderNo = "GPAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        PaymentOrder order = PaymentOrder.builder()
                .orderNo(orderNo)
                .userId(userId)
                .pgOrderId(purchaseInfo.getOrderId())
                .planCode("PRO_MONTHLY")
                .planName("PRO Membership (Google Pay)")
                .amount(new java.math.BigDecimal("10.00"))
                .status(PaymentStatus.COMPLETED)
                .pgProvider("GOOGLE_PAY")
                .createdAt(LocalDateTime.now())
                .paidAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        orderRepository.save(order);

        // 4. 유저 멤버십 업그레이드
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        user.setMembershipPlan(MembershipPlan.PRO);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Google Pay integration success: User {} upgraded to PRO", userId);

        return order;
    }

}
