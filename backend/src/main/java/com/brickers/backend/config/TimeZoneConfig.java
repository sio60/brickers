package com.brickers.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.TimeZone;

/**
 * 애플리케이션 전역 시간대 설정
 */
@Configuration
@Slf4j
public class TimeZoneConfig {

    @PostConstruct
    public void init() {
        // ✅ JVM의 기본 시간대를 한국 표준시(KST)로 고정
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));

        log.info("[TimeZoneConfig] JVM 타임존이 설정되었습니다: {}", TimeZone.getDefault().getID());
        log.info("[TimeZoneConfig] 현재 서버 시간: {}", LocalDateTime.now());
    }
}
