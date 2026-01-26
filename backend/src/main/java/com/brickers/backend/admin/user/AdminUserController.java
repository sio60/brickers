package com.brickers.backend.admin.user;

import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.entity.UserRole;
import com.brickers.backend.user.repository.UserRepository;
import com.brickers.backend.user.entity.AccountState;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    /** 유저 목록 조회 */
    @GetMapping
    public Page<User> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    /** 유저 상세 조회 */
    @GetMapping("/{userId}")
    public User getUserDetail(@PathVariable String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
    }

    /** 권한 변경 (USER <-> ADMIN) */
    @PostMapping("/{userId}/role")
    public User changeUserRole(@PathVariable String userId, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String roleStr = body.get("role");
        if (roleStr != null) {
            user.setRole(UserRole.valueOf(roleStr));
            userRepository.save(user);
        }
        return user;
    }

    /** 유저 정지 */
    @PostMapping("/{userId}/suspend")
    public User suspendUser(@PathVariable String userId, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String reason = body.getOrDefault("reason", "Admin dispatched suspension");
        user.suspend(reason);
        return userRepository.save(user);
    }

    /** 유저 정지 해제 */
    @PostMapping("/{userId}/unsuspend")
    public User unsuspendUser(@PathVariable String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setAccountState(AccountState.ACTIVE);
        user.setSuspendedReason(null);
        user.setSuspendedAt(null);
        return userRepository.save(user);
    }
}
