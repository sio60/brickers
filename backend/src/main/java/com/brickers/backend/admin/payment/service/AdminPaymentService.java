package com.brickers.backend.admin.payment.service;

import com.brickers.backend.admin.payment.dto.AdminPaymentDto;
import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.entity.PaymentStatus;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
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
        } else {
            order.markCanceled(finalReason);
        }

        paymentOrderRepository.save(order);
        return AdminPaymentDto.from(order);
    }
}
