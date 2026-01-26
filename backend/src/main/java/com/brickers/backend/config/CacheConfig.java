package com.brickers.backend.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        // 간단한 인메모리 캐시 매니저 (프로덕션에서는 Redis 등을 권장)
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        // 필요한 캐시 이름들을 미리 등록 가능
        // cacheManager.setCacheNames(List.of("users", "plans"));
        return cacheManager;
    }
}
