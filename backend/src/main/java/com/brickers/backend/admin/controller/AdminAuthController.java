package com.brickers.backend.admin.controller;

import com.brickers.backend.admin.service.AdminAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 관리자 인증 관리 API (Admin 전용)
 */
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService authService;

    /**
     * 특정 유저 강제 로그아웃
     * - 해당 유저의 모든 RefreshToken을 revoke 처리
     */
    @PostMapping("/force-logout/{userId}")
    public ResponseEntity<?> forceLogout(@PathVariable("userId") String userId) {
        authService.forceLogout(userId);
        return ResponseEntity.ok(Map.of(
                "message", "사용자가 강제 로그아웃되었습니다.",
                "userId", userId));
    }
}
