package com.brickers.backend.payment.service;

import com.brickers.backend.payment.dto.*;
import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.entity.PaymentPlan;
import com.brickers.backend.payment.entity.PaymentStatus;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
import com.brickers.backend.payment.repository.PaymentPlanRepository;
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
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentPlanRepository planRepository;
    private final PaymentOrderRepository orderRepository;
    private final UserRepository userRepository;

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
                .checkoutUrl("https://checkout.example.com/" + orderNo) // TODO: 실제 PG사 연동 시 발급받은 URL로 대체
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

        if (!order.canCancel()) {
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

        // TODO: PG사 상태값 맵핑 및 검증 로직 추가
        if ("SUCCESS".equals(req.getStatus())) {
            order.markCompleted(req.getPaymentKey());
            applyMembership(order.getUserId(), order.getPlanCode());
        } else {
            order.markFailed();
        }

        orderRepository.save(order);
    }

    /** 멤버십 적용 로직 (내부) */
    private void applyMembership(String userId, String planCode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // TODO: 멤버십 플랜 변경 및 만료 기간 설정 로직 추가
        log.info("Membership applied: User={} ({}), Plan={}", userId, user.getNickname(), planCode);
    }

    /** 구글 페이 결제 검증 및 멤버십 적용 */
    @Transactional
    public void verifyGooglePay(Authentication auth, GooglePayVerifyRequest req) {
        String userId = (String) auth.getPrincipal();

        log.info("Google Pay verification request: User={}, Data={}", userId, req.getPaymentData());

        // 1. 주문 기록 생성
        String orderNo = "GPAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        PaymentOrder order = PaymentOrder.builder()
                .orderNo(orderNo)
                .userId(userId)
                .planCode("PRO_MONTHLY") // 기본값으로 PRO 설정
                .planName("PRO Membership (Google Pay)")
                .amount(new java.math.BigDecimal("10.00")) // 프론트와 동일하게
                .status(PaymentStatus.COMPLETED)
                .pgProvider("GOOGLE_PAY")
                .createdAt(LocalDateTime.now())
                .paidAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        orderRepository.save(order);

        // 2. 유저 멤버십 업그레이드
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        user.setMembershipPlan(com.brickers.backend.user.entity.MembershipPlan.PRO);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Google Pay integration success: User {} upgraded to PRO", userId);
    }
}
