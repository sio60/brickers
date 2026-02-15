package com.brickers.backend.admin.user.service;

import com.brickers.backend.admin.user.dto.AdminUserDto;
import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.entity.UserRole;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<AdminUserDto> getUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(AdminUserDto::from);
    }

    @Transactional
    public AdminUserDto suspendUser(String userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.suspend(reason);
        userRepository.save(user);
        return AdminUserDto.from(user);
    }

    @Transactional
    public AdminUserDto activateUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setAccountState(AccountState.ACTIVE);
        user.setSuspendedAt(null);
        user.setSuspendedReason(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return AdminUserDto.from(user);
    }

    @Transactional
    public AdminUserDto updateUserRole(String userId, String role, String actorUserId) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("Role is required.");
        }

        UserRole targetRole;
        try {
            targetRole = UserRole.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + role);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (actorUserId != null && actorUserId.equals(userId) && targetRole == UserRole.USER) {
            throw new IllegalArgumentException("You cannot demote your own admin role.");
        }

        if (user.getRole() == targetRole) {
            return AdminUserDto.from(user);
        }

        user.setRole(targetRole);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return AdminUserDto.from(user);
    }
}
