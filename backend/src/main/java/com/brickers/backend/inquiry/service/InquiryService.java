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

    private final InquiryMapper inquiryMapper;
    private final InquiryHelper inquiryHelper;

    // ========== User Side ==========

    public InquiryResponse createInquiry(Authentication auth, InquiryCreateRequest req) {
        User user = currentUserService.get(auth);
        Inquiry inquiry = Inquiry.builder()
                .userId(user.getId()).title(req.getTitle()).content(req.getContent())
                .attachments(req.getAttachments() != null ? req.getAttachments() : new ArrayList<>())
                .status(InquiryStatus.OPEN).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        return inquiryMapper.toResponse(inquiryRepository.save(inquiry), user.getEmail());
    }

    public Page<InquiryResponse> getMyInquiries(Authentication auth, int page, int size) {
        User user = currentUserService.get(auth);
        Pageable pageable = inquiryHelper.createPageRequest(page, size, Sort.by("createdAt").descending());
        return inquiryRepository.findByUserId(user.getId(), pageable)
                .map(it -> inquiryMapper.toResponse(it, user.getEmail()));
    }

    public InquiryResponse getMyInquiry(Authentication auth, String id) {
        User me = currentUserService.get(auth);
        return inquiryMapper.toResponse(inquiryHelper.findAndValidateOwner(id, me.getId()), me.getEmail());
    }

    public InquiryResponse updateMyInquiry(Authentication auth, String id, InquiryUpdateRequest req) {
        User me = currentUserService.get(auth);
        Inquiry inquiry = inquiryHelper.findAndValidateOwner(id, me.getId());
        inquiryHelper.validateEditable(inquiry);

        if (req.getTitle() != null)
            inquiry.setTitle(req.getTitle());
        if (req.getContent() != null)
            inquiry.setContent(req.getContent());
        inquiry.setUpdatedAt(LocalDateTime.now());
        return inquiryMapper.toResponse(inquiryRepository.save(inquiry), me.getEmail());
    }

    public void deleteMyInquiry(Authentication auth, String id) {
        User me = currentUserService.get(auth);
        Inquiry inquiry = inquiryHelper.findAndValidateOwner(id, me.getId());
        inquiryHelper.validateDeletable(inquiry);
        inquiryRepository.delete(inquiry);
    }

    public InquiryResponse addAttachment(Authentication auth, String id, String url) {
        User me = currentUserService.get(auth);
        Inquiry inquiry = inquiryHelper.findAndValidateOwner(id, me.getId());
        inquiryHelper.validateEditable(inquiry);
        inquiry.addAttachment(url);
        inquiry.setUpdatedAt(LocalDateTime.now());
        return inquiryMapper.toResponse(inquiryRepository.save(inquiry), me.getEmail());
    }

    // ========== Admin Side ==========

    public Page<InquiryResponse> getAllInquiries(InquiryStatus status, int page, int size) {
        Pageable pageable = inquiryHelper.createPageRequest(page, size,
                Sort.by(Sort.Order.asc("answer.answeredAt"), Sort.Order.asc("createdAt")));
        Page<Inquiry> result = (status != null) ? inquiryRepository.findByStatus(status, pageable)
                : inquiryRepository.findAll(pageable);
        return result.map(it -> inquiryMapper.toResponse(it,
                userRepository.findById(it.getUserId()).map(User::getEmail).orElse(null)));
    }

    public InquiryResponse getInquiryDetail(String id) {
        Inquiry inquiry = inquiryHelper.findInquiry(id);
        String email = userRepository.findById(inquiry.getUserId()).map(User::getEmail).orElse(null);
        return inquiryMapper.toResponse(inquiry, email);
    }

    public InquiryResponse createAnswer(Authentication auth, String id, InquiryAnswerRequest req) {
        Inquiry inquiry = inquiryHelper.findInquiry(id);
        inquiry.setAnswer(InquiryAnswer.builder().content(req.getContent())
                .answeredBy(currentUserService.get(auth).getId()).answeredAt(LocalDateTime.now()).build());
        inquiry.setStatus(InquiryStatus.ANSWERED);
        inquiry.setUpdatedAt(LocalDateTime.now());
        Inquiry saved = inquiryRepository.save(inquiry);
        userNotificationService.notifyInquiryAnswered(saved.getUserId(), saved.getTitle());
        return inquiryMapper.toResponse(saved, null);
    }

    public InquiryResponse updateAnswer(Authentication auth, String id, InquiryAnswerRequest req) {
        Inquiry inquiry = inquiryHelper.findInquiry(id);
        if (inquiry.getAnswer() == null)
            throw new IllegalArgumentException("등록된 답변이 없습니다.");
        inquiry.getAnswer().setContent(req.getContent());
        inquiry.getAnswer().setUpdatedAt(LocalDateTime.now());
        inquiry.setUpdatedAt(LocalDateTime.now());
        return inquiryMapper.toResponse(inquiryRepository.save(inquiry), null);
    }

    public InquiryResponse changeStatus(String id, InquiryStatusRequest req) {
        Inquiry inquiry = inquiryHelper.findInquiry(id);
        inquiry.setStatus(req.getStatus());
        inquiry.setUpdatedAt(LocalDateTime.now());
        return inquiryMapper.toResponse(inquiryRepository.save(inquiry), null);
    }
}
