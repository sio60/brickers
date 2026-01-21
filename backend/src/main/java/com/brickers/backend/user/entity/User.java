package com.brickers.backend.user.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 사용자 엔티티 (MongoDB)
 * 소셜 로그인 사용자 정보 저장
 */
@Document(collection = "users")
@CompoundIndexes({
        // ✅ provider + providerId 조합으로 유니크 보장 (카카오/구글 providerId 충돌 방지)
        @CompoundIndex(name = "ux_provider_providerId", def = "{'provider': 1, 'providerId': 1}", unique = true),

        // (선택) 이메일 조회가 잦다면 인덱스 추천 (unique는 정책 확정 후)
        @CompoundIndex(name = "ix_email", def = "{'email': 1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    // 소셜 로그인 제공자 (kakao, google)
    private String provider;

    // 소셜 로그인 제공자의 사용자 ID
    // ❗ 단일 unique 제거: provider와 함께 복합 unique로 관리
    private String providerId;

    // 사용자 정보
    @Indexed // 조회용 (unique는 정책 확정 후)
    private String email;

    @Indexed // 닉네임 검색/중복체크를 한다면 인덱스 추천 (unique는 운영 정책 후)
    private String nickname;

    // 프로필 이미지 URL(또는 mediaId를 쓰면 정책에 맞게 타입/이름 변경)
    private String profileImage;

    // ✅ 프로필 소개(부기능에서 유용)
    private String bio;

    // ✅ 권한
    private UserRole role;

    // ✅ 멤버십 플랜 (FREE / PRO)
    private MembershipPlan membershipPlan;

    // ✅ 계정 상태 (ACTIVE / REQUESTED / SUSPENDED)
    private AccountState accountState;

    // ✅ 운영/감사 타임스탬프
    private LocalDateTime lastLoginAt;

    // 탈퇴/정지 관련
    private LocalDateTime deletedAt; // REQUESTED/탈퇴처리 시각
    private LocalDateTime suspendedAt; // SUSPENDED 된 시각
    private String suspendedReason; // 정지 사유(선택)

    // 생성/수정 시간
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** ✅ 기존 문서(필드 없는 유저) 호환을 위한 기본값 세팅 */
    public void ensureDefaults() {
        if (role == null)
            role = UserRole.USER;

        if (membershipPlan == null)
            membershipPlan = MembershipPlan.FREE;
        if (accountState == null)
            accountState = AccountState.ACTIVE;

        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null)
            createdAt = now;
        if (updatedAt == null)
            updatedAt = now;

        // lastLoginAt은 실제 로그인 시점에서 업데이트하는 게 베스트지만,
        // 기존 문서 호환용으로 null이면 채워둔다.
        if (lastLoginAt == null)
            lastLoginAt = now;

        // bio/profileImage/nickname/email 등은 null 허용(가입 시점 제공자 정책에 따라 다름)
    }

    /** 상태 변경 헬퍼(선택) */
    public void markDeleted() {
        this.accountState = AccountState.REQUESTED;
        this.deletedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void suspend(String reason) {
        this.accountState = AccountState.SUSPENDED;
        this.suspendedAt = LocalDateTime.now();
        this.suspendedReason = reason;
        this.updatedAt = LocalDateTime.now();
    }
}
