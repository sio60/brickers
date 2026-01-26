package com.brickers.backend.admin.payment;

import com.brickers.backend.admin.payment.dto.AdminPaymentDto;
import com.brickers.backend.admin.payment.service.AdminPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
public class AdminPaymentController {

    private final AdminPaymentService adminPaymentService;

    /** 결제 내역 목록 */
    @GetMapping
    public Page<AdminPaymentDto> getAllPayments(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return adminPaymentService.getAllPayments(page, size);
    }

    /** 결제 상세 */
    @GetMapping("/orders/{orderId}")
    public AdminPaymentDto getOrder(@PathVariable("orderId") String orderId) {
        return adminPaymentService.getOrder(orderId);
    }

    /** 결제 취소 (Admin 기능) */
    @PostMapping("/orders/{orderId}/cancel")
    public AdminPaymentDto cancelOrder(
            @PathVariable("orderId") String orderId,
            @RequestBody Map<String, String> body) {
        try {
            return adminPaymentService.cancelOrder(orderId, body.get("reason"));
        } catch (IllegalStateException e) {
            throw new IllegalArgumentException(e.getMessage());
        }
    }
}
