package com.brickers.backend.notification.dto;

import com.brickers.backend.notification.entity.NotificationType;
import com.brickers.backend.notification.entity.UserNotification;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MyNotificationResponse {
    private String id;
    private NotificationType type;
    private String title;
    private String message;
    private String linkUrl;
    private boolean read;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    public static MyNotificationResponse from(UserNotification notification) {
        return MyNotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .linkUrl(notification.getLinkUrl())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .build();
    }
}
