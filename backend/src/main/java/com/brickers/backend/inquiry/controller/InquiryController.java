package com.brickers.backend.inquiry.controller;

import com.brickers.backend.inquiry.dto.InquiryCreateRequest;
import com.brickers.backend.inquiry.dto.InquiryResponse;
import com.brickers.backend.inquiry.dto.InquiryUpdateRequest;
import com.brickers.backend.inquiry.service.InquiryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    /** 문의 등록 */
    @PostMapping
    public InquiryResponse createInquiry(Authentication auth, @RequestBody InquiryCreateRequest req) {
        return inquiryService.createInquiry(auth, req);
    }

    /** 내 문의 목록 */
    @GetMapping("/my")
    public Page<InquiryResponse> getMyInquiries(
            Authentication auth,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        return inquiryService.getMyInquiries(auth, page, size);
    }

    /** 내 문의 상세 */
    @GetMapping("/my/{inquiryId}")
    public InquiryResponse getMyInquiry(Authentication auth, @PathVariable("inquiryId") String inquiryId) {
        return inquiryService.getMyInquiry(auth, inquiryId);
    }

    /** 내 문의 수정 */
    @PatchMapping("/my/{inquiryId}")
    public InquiryResponse updateMyInquiry(
            Authentication auth,
            @PathVariable("inquiryId") String inquiryId,
            @RequestBody InquiryUpdateRequest req) {
        return inquiryService.updateMyInquiry(auth, inquiryId, req);
    }

    /** 내 문의 삭제 */
    @DeleteMapping("/my/{inquiryId}")
    public ResponseEntity<?> deleteMyInquiry(Authentication auth, @PathVariable("inquiryId") String inquiryId) {
        inquiryService.deleteMyInquiry(auth, inquiryId);
        return ResponseEntity.ok(Map.of("message", "문의가 삭제되었습니다."));
    }

    /** 첨부파일 추가 */
    @PostMapping("/my/{inquiryId}/attachments")
    public InquiryResponse addAttachment(
            Authentication auth,
            @PathVariable("inquiryId") String inquiryId,
            @RequestBody Map<String, String> body) {
        String url = body.get("url");
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("첨부파일 URL이 필요합니다.");
        }
        return inquiryService.addAttachment(auth, inquiryId, url);
    }
}
