package com.brickers.backend.billing.scheduler;

import com.brickers.backend.billing.entity.Subscription;
import com.brickers.backend.billing.entity.SubscriptionStatus;
import com.brickers.backend.billing.repository.SubscriptionRepository;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 구독 만료 스케줄러
 * - 만료된 구독을 EXPIRED로 변경
 * - 해당 사용자를 PRO → FREE로 다운그레이드
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionScheduler {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    /**
     * 매시간 정각에 만료된 구독 처리
     * cron: 초 분 시 일 월 요일
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void processExpiredSubscriptions() {
        log.info("만료 구독 스케줄러 시작");

        LocalDateTime now = LocalDateTime.now();

        // ACTIVE 또는 CANCELED 상태이면서 expiresAt이 현재 시간 이전인 구독 조회
        List<Subscription> expiredSubscriptions = subscriptionRepository.findByStatusInAndExpiresAtBefore(
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED),
                now
        );

        if (expiredSubscriptions.isEmpty()) {
            log.info("만료된 구독 없음");
            return;
        }

        log.info("만료 처리 대상: {}건", expiredSubscriptions.size());

        int successCount = 0;
        int failCount = 0;

        for (Subscription subscription : expiredSubscriptions) {
            try {
                // 1. 구독 상태 → EXPIRED
                subscription.expire();
                subscriptionRepository.save(subscription);

                // 2. 사용자 멤버십 → FREE 다운그레이드
                userRepository.findById(subscription.getUserId()).ifPresent(user -> {
                    if (user.getMembershipPlan() == MembershipPlan.PRO) {
                        user.setMembershipPlan(MembershipPlan.FREE);
                        user.setUpdatedAt(LocalDateTime.now());
                        userRepository.save(user);
                        log.info("멤버십 다운그레이드: userId={}, PRO → FREE", user.getId());
                    }
                });

                successCount++;
                log.info("구독 만료 처리 완료: subscriptionId={}, userId={}",
                        subscription.getId(), subscription.getUserId());

            } catch (Exception e) {
                failCount++;
                log.error("구독 만료 처리 실패: subscriptionId={}, error={}",
                        subscription.getId(), e.getMessage());
            }
        }

        log.info("만료 구독 스케줄러 완료: 성공={}, 실패={}", successCount, failCount);
    }
}
