package com.brickers.backend.notification.controller;

import com.brickers.backend.notification.dto.MyNotificationResponse;
import com.brickers.backend.notification.service.UserNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/my/notifications")
@RequiredArgsConstructor
public class MyNotificationController {

    private final UserNotificationService userNotificationService;

    @GetMapping
    public Page<MyNotificationResponse> getMyNotifications(
            Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return userNotificationService.getMyNotifications(authentication, page, size);
    }

    @PatchMapping("/{notificationId}/read")
    public MyNotificationResponse markAsRead(
            Authentication authentication,
            @PathVariable("notificationId") String notificationId) {
        return userNotificationService.markAsRead(authentication, notificationId);
    }
}
