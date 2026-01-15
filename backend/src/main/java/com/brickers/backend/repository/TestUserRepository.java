package com.brickers.backend.repository;

import com.brickers.backend.entity.TestUser;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * MongoDB 연결 테스트용 Repository
 */
@Repository
public interface TestUserRepository extends MongoRepository<TestUser, String> {
}
