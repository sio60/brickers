package com.brickers.backend.inquiry.service;

import com.brickers.backend.inquiry.dto.*;
import com.brickers.backend.inquiry.entity.Inquiry;
import com.brickers.backend.inquiry.entity.InquiryAnswer;
import com.brickers.backend.inquiry.entity.InquiryStatus;
import com.brickers.backend.inquiry.repository.InquiryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;

    // ========== User Side ==========

    public InquiryResponse createInquiry(Authentication auth, InquiryCreateRequest req) {
        String userId = (String) auth.getPrincipal();

        Inquiry inquiry = Inquiry.builder()
                .userId(userId)
                .title(req.getTitle())
                .content(req.getContent())
                .attachments(req.getAttachments() != null ? req.getAttachments() : new ArrayList<>())
                .status(InquiryStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return InquiryResponse.from(inquiryRepository.save(inquiry));
    }

    public Page<InquiryResponse> getMyInquiries(Authentication auth, int page, int size) {
        String userId = (String) auth.getPrincipal();
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return inquiryRepository.findByUserId(userId, pageable).map(InquiryResponse::from);
    }

    public InquiryResponse getMyInquiry(Authentication auth, String inquiryId) {
        String userId = (String) auth.getPrincipal();
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        if (!inquiry.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 문의만 조회 가능합니다.");
        }
        return InquiryResponse.from(inquiry);
    }

    public InquiryResponse updateMyInquiry(Authentication auth, String inquiryId, InquiryUpdateRequest req) {
        String userId = (String) auth.getPrincipal();
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        if (!inquiry.getUserId().equals(userId)) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }
        if (!inquiry.canEdit()) {
            throw new IllegalArgumentException("답변이 등록된 문의는 수정할 수 없습니다.");
        }

        if (req.getTitle() != null) {
            inquiry.setTitle(req.getTitle());
        }
        if (req.getContent() != null) {
            inquiry.setContent(req.getContent());
        }
        inquiry.setUpdatedAt(LocalDateTime.now());

        return InquiryResponse.from(inquiryRepository.save(inquiry));
    }

    public void deleteMyInquiry(Authentication auth, String inquiryId) {
        String userId = (String) auth.getPrincipal();
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        if (!inquiry.getUserId().equals(userId)) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }
        if (!inquiry.canDelete()) {
            throw new IllegalArgumentException("답변이 등록된 문의는 삭제할 수 없습니다.");
        }

        inquiryRepository.delete(inquiry);
    }

    public InquiryResponse addAttachment(Authentication auth, String inquiryId, String attachmentUrl) {
        String userId = (String) auth.getPrincipal();
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        if (!inquiry.getUserId().equals(userId)) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }
        if (!inquiry.canEdit()) {
            throw new IllegalArgumentException("답변이 등록된 문의에는 첨부파일을 추가할 수 없습니다.");
        }

        inquiry.addAttachment(attachmentUrl);
        inquiry.setUpdatedAt(LocalDateTime.now());

        return InquiryResponse.from(inquiryRepository.save(inquiry));
    }

    // ========== Admin Side ==========

    public Page<InquiryResponse> getAllInquiries(InquiryStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (status != null) {
            return inquiryRepository.findByStatus(status, pageable).map(InquiryResponse::from);
        }
        return inquiryRepository.findAll(pageable).map(InquiryResponse::from);
    }

    public InquiryResponse getInquiryDetail(String inquiryId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));
        return InquiryResponse.from(inquiry);
    }

    public InquiryResponse createAnswer(Authentication auth, String inquiryId, InquiryAnswerRequest req) {
        String adminId = (String) auth.getPrincipal();
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        InquiryAnswer answer = InquiryAnswer.builder()
                .content(req.getContent())
                .answeredBy(adminId)
                .answeredAt(LocalDateTime.now())
                .build();

        inquiry.setAnswer(answer);
        inquiry.setStatus(InquiryStatus.ANSWERED);
        inquiry.setUpdatedAt(LocalDateTime.now());

        return InquiryResponse.from(inquiryRepository.save(inquiry));
    }

    public InquiryResponse updateAnswer(Authentication auth, String inquiryId, InquiryAnswerRequest req) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        if (inquiry.getAnswer() == null) {
            throw new IllegalArgumentException("등록된 답변이 없습니다.");
        }

        InquiryAnswer answer = inquiry.getAnswer();
        answer.setContent(req.getContent());
        answer.setUpdatedAt(LocalDateTime.now());
        inquiry.setUpdatedAt(LocalDateTime.now());

        return InquiryResponse.from(inquiryRepository.save(inquiry));
    }

    public InquiryResponse changeStatus(String inquiryId, InquiryStatusRequest req) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        inquiry.setStatus(req.getStatus());
        inquiry.setUpdatedAt(LocalDateTime.now());

        return InquiryResponse.from(inquiryRepository.save(inquiry));
    }
}
