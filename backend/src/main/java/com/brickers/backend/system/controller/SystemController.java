package com.brickers.backend.system.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * 시스템 상태 및 공통 유틸리티 API
 */
@RestController
@RequestMapping("/api")
@Slf4j
public class SystemController {

    /**
     * ✅ 서버 상태 확인 (L4/L7 헬스체크용)
     */
    @GetMapping("/health")
    public String health() {
        return "OK";
    }

    /**
     * ✅ 프론트엔드 에러 보고용
     * 클라이언트 측에서 발생한 런타임 에러를 서버 로그로 수집
     */
    @PostMapping("/errors")
    public ResponseEntity<Void> reportError(@RequestBody Map<String, Object> errorData) {
        // [FE-ERROR] prefix를 붙여 로그 수집기에서 필터링하기 쉽게 함
        log.error("[FE-ERROR] Client reported an error: {}", errorData);

        // 에러를 받았으므로 204 No Content 반환
        return ResponseEntity.noContent().build();
    }
}
