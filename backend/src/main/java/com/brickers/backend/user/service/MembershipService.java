package com.brickers.backend.user.service;

import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 🎖️ MembershipService
 * 
 * 사용자의 멤버십 플랜(BASIC, PRO 등) 변경 및 관리를 전담합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MembershipService {

    private final UserRepository userRepository;

    /**
     * 특정 사용자의 멤버십을 특정 플랜 코드로 업데이트합니다.
     */
    @Transactional
    public void applyMembership(String userId, String planCode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. userId=" + userId));

        // planCode에 따라 멤버십 플랜 결정 (PRO 키워드 포함 시 PRO)
        if (planCode != null && planCode.toUpperCase().contains("PRO")) {
            user.setMembershipPlan(MembershipPlan.PRO);
        } else {
            user.setMembershipPlan(MembershipPlan.FREE);
        }

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Membership updated to {} for User: {} ({})",
                user.getMembershipPlan(), userId, user.getNickname());
    }

    /**
     * 사용자의 멤버십을 PRO 등급으로 즉시 상향합니다.
     */
    @Transactional
    public void upgradeToPro(String userId) {
        applyMembership(userId, "PRO");
    }
}
