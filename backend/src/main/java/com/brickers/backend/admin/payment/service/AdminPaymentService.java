package com.brickers.backend.admin.payment.service;

import com.brickers.backend.admin.payment.dto.AdminPaymentDto;
import com.brickers.backend.payment.entity.PaymentOrder;
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
        return paymentOrderRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(AdminPaymentDto::from);
    }

    @Transactional(readOnly = true)
    public AdminPaymentDto getOrder(String orderId) {
        PaymentOrder order = paymentOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return AdminPaymentDto.from(order);
    }

    @Transactional
    public AdminPaymentDto cancelOrder(String orderId, String reason) {
        PaymentOrder order = paymentOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (!order.canCancel()) {
            // In a real scenario, you might throw a specific business exception
            throw new IllegalStateException("Cannot cancel logic state");
        }

        order.markCanceled(reason == null ? "Admin cancelled" : reason);
        paymentOrderRepository.save(order);
        return AdminPaymentDto.from(order);
    }
}
