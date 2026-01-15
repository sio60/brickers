package com.brickers.backend.repository;

import com.brickers.backend.entity.User;
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
}
