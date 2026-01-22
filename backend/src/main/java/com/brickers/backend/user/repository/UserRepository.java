package com.brickers.backend.user.repository;

import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.User;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

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
}
