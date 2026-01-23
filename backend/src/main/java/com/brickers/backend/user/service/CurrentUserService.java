package com.brickers.backend.user.service;

import com.brickers.backend.common.exception.ForbiddenException;
import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public User get(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new ForbiddenException("로그인이 필요합니다.");
        }

        String userId = String.valueOf(auth.getPrincipal());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ForbiddenException("사용자 정보를 찾을 수 없습니다."));

        user.ensureDefaults();

        AccountState st = user.getAccountState();
        if (st == AccountState.REQUESTED)
            throw new ForbiddenException("탈퇴 처리 중인 계정입니다.");
        if (st == AccountState.DELETED)
            throw new ForbiddenException("탈퇴 완료된 계정입니다.");
        if (st == AccountState.SUSPENDED)
            throw new ForbiddenException("정지된 계정입니다.");

        return user;
    }
}
