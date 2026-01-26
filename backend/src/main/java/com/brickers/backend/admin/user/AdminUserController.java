package com.brickers.backend.admin.user;

import com.brickers.backend.admin.user.dto.AdminUserDto;
import com.brickers.backend.admin.user.service.AdminUserService;
import com.brickers.backend.user.service.CurrentUserService;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final CurrentUserService currentUserService;

    /** 유저 목록 조회 */
    @GetMapping
    public Page<AdminUserDto> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminUserService.getAllUsers(page, size);
    }

    /** 유저 상세 조회 */
    @GetMapping("/{userId}")
    public AdminUserDto getUserDetail(@PathVariable String userId) {
        return adminUserService.getUserDetail(userId);
    }

    /** 권한 변경 (USER <-> ADMIN) */
    /** 권한 변경 (USER <-> ADMIN) */
    @PostMapping("/{userId}/role")
    public AdminUserDto changeUserRole(
            Authentication auth,
            @PathVariable String userId,
            @RequestBody Map<String, String> body) {
        String role = body.get("role");
        String actorId = currentUserService.get(auth).getId(); // ✅ 현재 방식: principal == userId

        return adminUserService.changeUserRole(userId, role, actorId);
    }

    /** 유저 정지 */
    @PostMapping("/{userId}/suspend")
    public AdminUserDto suspendUser(@PathVariable String userId, @RequestBody Map<String, String> body) {
        return adminUserService.suspendUser(userId, body.get("reason"));
    }

    /** 유저 정지 해제 */
    @PostMapping("/{userId}/unsuspend")
    public AdminUserDto unsuspendUser(@PathVariable String userId) {
        return adminUserService.unsuspendUser(userId);
    }
}
