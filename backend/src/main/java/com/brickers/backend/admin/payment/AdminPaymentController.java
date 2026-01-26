package com.brickers.backend.admin.payment;

import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
public class AdminPaymentController {

    private final PaymentOrderRepository paymentOrderRepository;

    /** 결제 내역 목록 */
    @GetMapping
    public Page<PaymentOrder> getAllPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return paymentOrderRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    /** 결제 상세 */
    @GetMapping("/orders/{orderId}")
    public PaymentOrder getOrder(@PathVariable String orderId) {
        return paymentOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
    }

    /** 결제 취소 (Admin 기능, 실제 환불 로직은 Service 연동 필요) */
    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable String orderId, @RequestBody Map<String, String> body) {
        PaymentOrder order = paymentOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        String reason = body.getOrDefault("reason", "Admin cancelled");

        if (!order.canCancel()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot cancel logic state"));
        }

        // TODO: PG사 취소 API 연동 필요 (Service 레이어 위임 권장)
        // 여기서는 상태 변경만 처리
        order.markCanceled(reason);
        paymentOrderRepository.save(order);

        return ResponseEntity.ok(order);
    }
}
