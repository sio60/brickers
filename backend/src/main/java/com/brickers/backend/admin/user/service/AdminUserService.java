package com.brickers.backend.admin.user.service;

import com.brickers.backend.admin.user.dto.AdminUserDto;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import com.brickers.backend.user.entity.AccountState;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<AdminUserDto> getUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(AdminUserDto::from);
        // TODO: 검색 기능 추가 (e.g. findByNicknameContainingOrEmailContaining)
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
        // User 엔티티에 activate 메서드가 없으므로 직접 세터 사용
        user.setAccountState(AccountState.ACTIVE);
        user.setSuspendedAt(null);
        user.setSuspendedReason(null);
        user.setUpdatedAt(java.time.LocalDateTime.now());
        userRepository.save(user);
        return AdminUserDto.from(user);
    }
}
