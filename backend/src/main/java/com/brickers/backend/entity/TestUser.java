package com.brickers.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * MongoDB 연결 테스트용 임시 엔티티
 * 성공적으로 저장되면 Compass에서 'test_users' 컬렉션 확인 가능
 */
@Document(collection = "test_users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestUser {

    @Id
    private String id;

    private String name;
    private String email;
    private LocalDateTime createdAt;
}
