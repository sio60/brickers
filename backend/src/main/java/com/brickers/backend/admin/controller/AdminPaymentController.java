package com.brickers.backend.admin.controller;

import com.brickers.backend.admin.dto.AdminPaymentDto;
import com.brickers.backend.admin.service.AdminPaymentService;
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

    /** 환불 요청 목록 조회 (REFUND_REQUESTED 상태) */
    @GetMapping("/refund-requests")
    public Page<AdminPaymentDto> getRefundRequests(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return adminPaymentService.getRefundRequests(page, size);
    }

    /** 환불 승인 (REFUND_REQUESTED → REFUNDED) */
    @PostMapping("/orders/{orderId}/approve-refund")
    public AdminPaymentDto approveRefund(@PathVariable("orderId") String orderId) {
        try {
            return adminPaymentService.approveRefund(orderId);
        } catch (IllegalStateException e) {
            throw new IllegalArgumentException(e.getMessage());
        }
    }

    /** 환불 거절 (REFUND_REQUESTED → COMPLETED 원복) */
    @PostMapping("/orders/{orderId}/reject-refund")
    public AdminPaymentDto rejectRefund(
            @PathVariable("orderId") String orderId,
            @RequestBody Map<String, String> body) {
        try {
            return adminPaymentService.rejectRefund(orderId, body.get("reason"));
        } catch (IllegalStateException e) {
            throw new IllegalArgumentException(e.getMessage());
        }
    }
}
