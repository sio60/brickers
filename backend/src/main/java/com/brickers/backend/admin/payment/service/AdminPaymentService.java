package com.brickers.backend.admin.payment.service;

import com.brickers.backend.admin.payment.dto.AdminPaymentDto;
import com.brickers.backend.notification.service.UserNotificationService;
import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.entity.PaymentStatus;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminPaymentService {

    private final PaymentOrderRepository paymentOrderRepository;
    private final UserRepository userRepository;
    private final UserNotificationService userNotificationService;

    @Transactional(readOnly = true)
    public Page<AdminPaymentDto> getAllPayments(int page, int size) {
        return paymentOrderRepository
                .findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(AdminPaymentDto::from);
    }

    @Transactional(readOnly = true)
    public AdminPaymentDto getOrder(String orderId) {
        PaymentOrder order = paymentOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found. id=" + orderId));
        return AdminPaymentDto.from(order);
    }

    // ✅ 추가
    @Transactional(readOnly = true)
    public AdminPaymentDto getOrderByOrderNo(String orderNo) {
        PaymentOrder order = paymentOrderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new IllegalArgumentException("Order not found. orderNo=" + orderNo));
        return AdminPaymentDto.from(order);
    }

    @Transactional
    public AdminPaymentDto cancelOrder(String orderId, String reason) {
        PaymentOrder order = paymentOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found. id=" + orderId));

        if (!order.canCancelByAdmin()) {
            throw new IllegalStateException("Cannot cancel. status=" + order.getStatus());
        }

        String finalReason = (reason == null || reason.isBlank()) ? "Admin cancelled" : reason;

        // COMPLETED면 환불(REFUNDED), PENDING이면 취소(CANCELED)
        if (order.getStatus() == PaymentStatus.COMPLETED) {
            order.markRefunded(finalReason);
        } else if (order.getStatus() == PaymentStatus.REFUND_REQUESTED) {
            order.markRefunded(finalReason);
        } else {
            order.markCanceled(finalReason);
        }

        paymentOrderRepository.save(order);
        return AdminPaymentDto.from(order);
    }

    // 환불 요청 목록 조회 (REFUND_REQUESTED 상태만)
    @Transactional(readOnly = true)
    public Page<AdminPaymentDto> getRefundRequests(int page, int size) {
        return paymentOrderRepository
                .findByStatus(PaymentStatus.REFUND_REQUESTED,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt")))
                .map(AdminPaymentDto::from);
    }

    // 환불 승인 (REFUND_REQUESTED → REFUNDED)
    @Transactional
    public AdminPaymentDto approveRefund(String orderId) {
        PaymentOrder order = paymentOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found. id=" + orderId));

        if (!order.canRefundByAdmin()) {
            throw new IllegalStateException("Cannot approve refund. status=" + order.getStatus());
        }

        order.markRefunded(order.getCancelReason() != null ? order.getCancelReason() : "Admin approved refund");
        paymentOrderRepository.save(order);

        // ✅ 환불 승인 시 즉시 멤버십 해제 (PRO -> FREE)
        userRepository.findById(order.getUserId()).ifPresent(user -> {
            if (user.getMembershipPlan() == MembershipPlan.PRO) {
                user.setMembershipPlan(MembershipPlan.FREE);
                user.setUpdatedAt(java.time.LocalDateTime.now());
                userRepository.save(user);
            }
        });

        userNotificationService.notifyRefundHandled(
                order.getUserId(),
                order.getOrderNo(),
                true,
                order.getCancelReason());

        return AdminPaymentDto.from(order);
    }

    // 환불 거절 (REFUND_REQUESTED → COMPLETED 원복)
    @Transactional
    public AdminPaymentDto rejectRefund(String orderId, String reason) {
        PaymentOrder order = paymentOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found. id=" + orderId));

        if (!order.canRefundByAdmin()) {
            throw new IllegalStateException("Cannot reject refund. status=" + order.getStatus());
        }

        order.revertToCompleted();
        paymentOrderRepository.save(order);
        userNotificationService.notifyRefundHandled(
                order.getUserId(),
                order.getOrderNo(),
                false,
                reason);
        return AdminPaymentDto.from(order);
    }
}
