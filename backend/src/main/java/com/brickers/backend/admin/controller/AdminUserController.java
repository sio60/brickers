package com.brickers.backend.admin.controller;

import com.brickers.backend.admin.dto.AdminUserDto;
import com.brickers.backend.admin.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<Page<AdminUserDto>> getUsers(
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(adminUserService.getUsers(pageable));
    }

    @PostMapping("/{userId}/suspend")
    public ResponseEntity<AdminUserDto> suspendUser(
            @PathVariable String userId,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "Admin suspended");
        return ResponseEntity.ok(adminUserService.suspendUser(userId, reason));
    }

    @PostMapping("/{userId}/activate")
    public ResponseEntity<AdminUserDto> activateUser(@PathVariable String userId) {
        return ResponseEntity.ok(adminUserService.activateUser(userId));
    }

    @PostMapping("/{userId}/role")
    public ResponseEntity<AdminUserDto> updateUserRole(
            @PathVariable String userId,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String role = body.get("role");
        String actorUserId = authentication != null ? String.valueOf(authentication.getPrincipal()) : null;
        return ResponseEntity.ok(adminUserService.updateUserRole(userId, role, actorUserId));
    }
}
