package com.brickers.backend.admin.user.service;

import com.brickers.backend.admin.user.dto.AdminUserDto;
import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.entity.UserRole;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<AdminUserDto> getAllUsers(int page, int size) {
        return userRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(AdminUserDto::from);
    }

    @Transactional(readOnly = true)
    public AdminUserDto getUserDetail(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return AdminUserDto.from(user);
    }

    @Transactional
    public AdminUserDto changeUserRole(String userId, String roleStr, String actorId) {

        if (roleStr == null)
            throw new IllegalArgumentException("role is required");

        UserRole newRole;
        try {
            newRole = UserRole.valueOf(roleStr);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid role: " + roleStr);
        }

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));

        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Target user not found"));

        // 🔒 자기 자신 강등 금지
        if (actor.getId().equals(target.getId()) && newRole != UserRole.ADMIN) {
            throw new IllegalArgumentException("Cannot downgrade yourself");
        }

        // 🔒 마지막 ADMIN 보호
        if (target.getRole() == UserRole.ADMIN && newRole != UserRole.ADMIN) {
            long adminCount = userRepository.countByRole(UserRole.ADMIN);
            if (adminCount <= 1) {
                throw new IllegalArgumentException("At least one ADMIN required");
            }
        }

        target.setRole(newRole);
        userRepository.save(target);
        return AdminUserDto.from(target);
    }

    @Transactional
    public AdminUserDto suspendUser(String userId, String reason) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (target.getRole() == UserRole.ADMIN) {
            long adminCount = userRepository.countByRole(UserRole.ADMIN);
            if (adminCount <= 1) {
                throw new IllegalArgumentException("Cannot suspend the last ADMIN");
            }
        }

        target.suspend(reason == null ? "Admin dispatched suspension" : reason);
        userRepository.save(target);
        return AdminUserDto.from(target);
    }

    @Transactional
    public AdminUserDto unsuspendUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setAccountState(AccountState.ACTIVE);
        user.setSuspendedReason(null);
        user.setSuspendedAt(null);
        userRepository.save(user);
        return AdminUserDto.from(user);
    }
}
