package com.brickers.backend.inquiry.service;

import com.brickers.backend.inquiry.dto.*;
import com.brickers.backend.inquiry.entity.Inquiry;
import com.brickers.backend.inquiry.entity.InquiryAnswer;
import com.brickers.backend.inquiry.entity.InquiryStatus;
import com.brickers.backend.inquiry.repository.InquiryRepository;
import com.brickers.backend.notification.service.UserNotificationService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import com.brickers.backend.user.service.CurrentUserService;
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
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final UserNotificationService userNotificationService;

    // ========== User Side ==========

    public InquiryResponse createInquiry(Authentication auth, InquiryCreateRequest req) {
        User user = currentUserService.get(auth);

        Inquiry inquiry = Inquiry.builder()
                .userId(user.getId())
                .title(req.getTitle())
                .content(req.getContent())
                .attachments(req.getAttachments() != null ? req.getAttachments() : new ArrayList<>())
                .status(InquiryStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        InquiryResponse resp = InquiryResponse.from(inquiryRepository.save(inquiry));
        resp.setUserEmail(user.getEmail());
        return resp;
    }

    public Page<InquiryResponse> getMyInquiries(Authentication auth, int page, int size) {
        User user = currentUserService.get(auth);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return inquiryRepository.findByUserId(user.getId(), pageable).map(it -> {
            InquiryResponse resp = InquiryResponse.from(it);
            resp.setUserEmail(user.getEmail());
            return resp;
        });
    }

    public InquiryResponse getMyInquiry(Authentication auth, String inquiryId) {
        User user = currentUserService.get(auth);
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        if (!inquiry.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("본인의 문의만 조회 가능합니다.");
        }
        InquiryResponse resp = InquiryResponse.from(inquiry);
        resp.setUserEmail(user.getEmail());
        return resp;
    }

    public InquiryResponse updateMyInquiry(Authentication auth, String inquiryId, InquiryUpdateRequest req) {
        User user = currentUserService.get(auth);
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        if (!inquiry.getUserId().equals(user.getId())) {
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

        InquiryResponse resp = InquiryResponse.from(inquiryRepository.save(inquiry));
        resp.setUserEmail(user.getEmail());
        return resp;
    }

    public void deleteMyInquiry(Authentication auth, String inquiryId) {
        User user = currentUserService.get(auth);
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        if (!inquiry.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }
        if (!inquiry.canDelete()) {
            throw new IllegalArgumentException("답변이 등록된 문의는 삭제할 수 없습니다.");
        }

        inquiryRepository.delete(inquiry);
    }

    public InquiryResponse addAttachment(Authentication auth, String inquiryId, String attachmentUrl) {
        User user = currentUserService.get(auth);
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));

        if (!inquiry.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }
        if (!inquiry.canEdit()) {
            throw new IllegalArgumentException("답변이 등록된 문의에는 첨부파일을 추가할 수 없습니다.");
        }

        inquiry.addAttachment(attachmentUrl);
        inquiry.setUpdatedAt(LocalDateTime.now());

        InquiryResponse resp = InquiryResponse.from(inquiryRepository.save(inquiry));
        resp.setUserEmail(user.getEmail());
        return resp;
    }

    // ========== Admin Side ==========

    public Page<InquiryResponse> getAllInquiries(InquiryStatus status, int page, int size) {
        // 답변이 없는 문의(answer.answeredAt == null)를 먼저 보여주고, 같은 그룹 내에서는 오래된순 정렬
        Sort sort = Sort.by(
                Sort.Order.asc("answer.answeredAt"),
                Sort.Order.asc("createdAt"));
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Inquiry> inquiries = (status != null)
                ? inquiryRepository.findByStatus(status, pageable)
                : inquiryRepository.findAll(pageable);

        return inquiries.map(it -> {
            InquiryResponse resp = InquiryResponse.from(it);
            userRepository.findById(it.getUserId()).ifPresent(user -> resp.setUserEmail(user.getEmail()));
            return resp;
        });
    }

    public InquiryResponse getInquiryDetail(String inquiryId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));
        InquiryResponse resp = InquiryResponse.from(inquiry);
        userRepository.findById(inquiry.getUserId()).ifPresent(user -> resp.setUserEmail(user.getEmail()));
        return resp;
    }

    public InquiryResponse createAnswer(Authentication auth, String inquiryId, InquiryAnswerRequest req) {
        String adminId = currentUserService.get(auth).getId();
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
        Inquiry saved = inquiryRepository.save(inquiry);
        userNotificationService.notifyInquiryAnswered(saved.getUserId(), saved.getTitle());
        return InquiryResponse.from(saved);
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
