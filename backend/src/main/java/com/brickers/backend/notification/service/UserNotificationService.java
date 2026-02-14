package com.brickers.backend.notification.service;

import com.brickers.backend.common.exception.ForbiddenException;
import com.brickers.backend.notification.dto.MyNotificationResponse;
import com.brickers.backend.notification.entity.NotificationType;
import com.brickers.backend.notification.entity.UserNotification;
import com.brickers.backend.notification.repository.UserNotificationRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserNotificationService {

    private final UserNotificationRepository userNotificationRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public Page<MyNotificationResponse> getMyNotifications(Authentication authentication, int page, int size) {
        User user = currentUserService.get(authentication);
        int boundedSize = Math.max(1, Math.min(size, 100));
        PageRequest pageable = PageRequest.of(page, boundedSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        return userNotificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(MyNotificationResponse::from);
    }

    @Transactional
    public MyNotificationResponse markAsRead(Authentication authentication, String notificationId) {
        User user = currentUserService.get(authentication);
        UserNotification notification = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다. id=" + notificationId));

        if (!user.getId().equals(notification.getUserId())) {
            throw new ForbiddenException("본인 알림만 수정할 수 있습니다.");
        }

        notification.markRead();
        return MyNotificationResponse.from(userNotificationRepository.save(notification));
    }

    @Transactional
    public void notifyInquiryAnswered(String userId, String inquiryTitle) {
        createNotification(
                userId,
                NotificationType.INQUIRY_ANSWERED,
                "문의 답변이 등록되었습니다.",
                String.format("문의 \"%s\"에 대한 관리자 답변이 등록되었습니다.", safeText(inquiryTitle, 30)),
                "/mypage?menu=inquiries");
    }

    @Transactional
    public void notifyReportHandled(String userId, boolean approved, String note) {
        if (approved) {
            createNotification(
                    userId,
                    NotificationType.REPORT_APPROVED,
                    "신고 처리 결과가 등록되었습니다.",
                    "신고가 승인되어 처리되었습니다.",
                    "/mypage?menu=reports");
            return;
        }

        createNotification(
                userId,
                NotificationType.REPORT_REJECTED,
                "신고 처리 결과가 등록되었습니다.",
                "신고가 반려되었습니다. 사유: " + safeText(note, 80),
                "/mypage?menu=reports");
    }

    @Transactional
    public void notifyRefundHandled(String userId, String orderNo, boolean approved, String reason) {
        if (approved) {
            createNotification(
                    userId,
                    NotificationType.REFUND_APPROVED,
                    "환불 요청이 승인되었습니다.",
                    String.format("주문번호 %s의 환불이 승인되었습니다.", safeText(orderNo, 30)),
                    "/mypage?menu=refunds");
            return;
        }

        createNotification(
                userId,
                NotificationType.REFUND_REJECTED,
                "환불 요청이 거절되었습니다.",
                String.format("주문번호 %s의 환불이 거절되었습니다. 사유: %s",
                        safeText(orderNo, 30),
                        safeText(reason, 80)),
                "/mypage?menu=refunds");
    }

    @Transactional
    public UserNotification createNotification(
            String userId,
            NotificationType type,
            String title,
            String message,
            String linkUrl) {

        if (userId == null || userId.isBlank()) {
            return null;
        }

        UserNotification notification = UserNotification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .linkUrl(linkUrl)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();

        return userNotificationRepository.save(notification);
    }

    private String safeText(String text, int maxLength) {
        if (text == null || text.isBlank()) {
            return "-";
        }
        String trimmed = text.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength) + "...";
    }
}
