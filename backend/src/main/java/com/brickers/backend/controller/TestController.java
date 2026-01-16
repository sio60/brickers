package com.brickers.backend.controller;

import com.brickers.backend.entity.TestUser;
import com.brickers.backend.repository.TestUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * MongoDB 연결 테스트용 컨트롤러
 * 
 * GET /api/test/mongodb - 연결 상태 확인
 * POST /api/test/mongodb - 테스트 데이터 저장
 * GET /api/test/mongodb/all - 저장된 모든 데이터 조회
 */
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final TestUserRepository testUserRepository;

    /**
     * MongoDB 연결 상태 확인
     */

    @GetMapping("/env-check")
    public String check() {
        return System.getenv("PRIMARY_MONGODB_URI");
    }

    @GetMapping("/mongodb")
    public ResponseEntity<Map<String, Object>> checkConnection() {
        Map<String, Object> response = new HashMap<>();
        try {
            long count = testUserRepository.count();
            response.put("status", "connected");
            response.put("message", "MongoDB 로컬 연결 성공!");
            response.put("collection", "test_users");
            response.put("documentCount", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "MongoDB 연결 실패: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * 테스트 데이터 저장
     */
    @PostMapping("/mongodb")
    public ResponseEntity<Map<String, Object>> saveTestData() {
        Map<String, Object> response = new HashMap<>();
        try {
            TestUser testUser = TestUser.builder()
                    .name("테스트 사용자")
                    .email("test@brickers.shop")
                    .createdAt(LocalDateTime.now())
                    .build();

            TestUser saved = testUserRepository.save(testUser);

            response.put("status", "success");
            response.put("message", "테스트 데이터 저장 성공! Compass에서 확인하세요.");
            response.put("savedUser", saved);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "저장 실패: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * 모든 테스트 데이터 조회
     */
    @GetMapping("/mongodb/all")
    public ResponseEntity<List<TestUser>> getAllTestData() {
        return ResponseEntity.ok(testUserRepository.findAll());
    }
}
