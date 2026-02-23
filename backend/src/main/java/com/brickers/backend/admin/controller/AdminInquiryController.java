package com.brickers.backend.admin.controller;

import com.brickers.backend.inquiry.dto.InquiryAnswerRequest;
import com.brickers.backend.inquiry.dto.InquiryResponse;
import com.brickers.backend.inquiry.dto.InquiryStatusRequest;
import com.brickers.backend.inquiry.entity.InquiryStatus;
import com.brickers.backend.inquiry.service.InquiryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/inquiries")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminInquiryController {

    private final InquiryService inquiryService;

    /** 전체 문의 목록 (상태 필터 가능) */
    @GetMapping
    public Page<InquiryResponse> getAllInquiries(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "status", required = false) InquiryStatus status) {
        return inquiryService.getAllInquiries(status, page, size);
    }

    /** 문의 상세 */
    @GetMapping("/{inquiryId}")
    public InquiryResponse getInquiryDetail(
            @PathVariable("inquiryId") String inquiryId) {
        return inquiryService.getInquiryDetail(inquiryId);
    }

    /** 답변 등록 */
    @PostMapping("/{inquiryId}/answer")
    public InquiryResponse createAnswer(
            Authentication auth,
            @PathVariable("inquiryId") String inquiryId,
            @RequestBody InquiryAnswerRequest req) {
        return inquiryService.createAnswer(auth, inquiryId, req);
    }

    /** 답변 수정 */
    @PatchMapping("/{inquiryId}/answer")
    public InquiryResponse updateAnswer(
            Authentication auth,
            @PathVariable("inquiryId") String inquiryId,
            @RequestBody InquiryAnswerRequest req) {
        return inquiryService.updateAnswer(auth, inquiryId, req);
    }

    /** 상태 변경 */
    @PostMapping("/{inquiryId}/status")
    public InquiryResponse changeStatus(
            @PathVariable("inquiryId") String inquiryId,
            @RequestBody InquiryStatusRequest req) {
        return inquiryService.changeStatus(inquiryId, req);
    }
}
