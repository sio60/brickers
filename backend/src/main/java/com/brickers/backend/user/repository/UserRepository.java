package com.brickers.backend.user.repository;

import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.entity.UserRole;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List; // [New]

/**
 * 사용자 MongoDB Repository
 */
@Repository
public interface UserRepository extends MongoRepository<User, String> {

    // 소셜 로그인 제공자 ID로 사용자 찾기
    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    // 이메일로 사용자 찾기
    Optional<User> findByEmail(String email);

    // ✅ (선택) 정상 계정만 조회하고 싶을 때(나중에 로그인 차단/탈퇴처리 정책에 유용)
    Optional<User> findByProviderAndProviderIdAndAccountState(String provider, String providerId,
            AccountState accountState);

    // 닉네임 존재 여부 확인
    boolean existsByNickname(String nickname);

    // 이메일 존재 여부 확인
    boolean existsByEmail(String email);

    // 닉네임으로 사용자 찾기
    Optional<User> findByNickname(String nickname);

    // [New] 기간별 가입자 수 집계용
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByRole(UserRole role);

    // [New] 닉네임 또는 이메일 부분 일치 검색 (관리자용)
    List<User> findByNicknameContainingOrEmailContaining(String nickname, String email);
}
