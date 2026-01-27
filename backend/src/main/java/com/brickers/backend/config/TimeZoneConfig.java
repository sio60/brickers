package com.brickers.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.util.TimeZone;

/**
 * 애플리케이션 전역 시간대 설정
 */
@Configuration
public class TimeZoneConfig {

    @PostConstruct
    public void init() {
        // ✅ JVM의 기본 시간대를 한국 표준시(KST)로 고정
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
    }
}
