package com.brickers.backend.notification.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "user_notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNotification {

    @Id
    private String id;

    @Indexed
    private String userId;

    private NotificationType type;

    private String title;
    private String message;
    private String linkUrl;

    @Builder.Default
    private boolean read = false;

    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    public void markRead() {
        if (!this.read) {
            this.read = true;
            this.readAt = LocalDateTime.now();
        }
    }
}
