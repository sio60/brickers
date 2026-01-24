package com.brickers.backend.kids.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AiServerConfig {

    @Value("${ai.server.url:http://localhost:8000}")
    private String aiServerUrl;

    @Bean
    public WebClient aiWebClient() {
        // 메모리 제한 설정 (10MB) - 여기서 설정해야 합니다!
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();

        return WebClient.builder()
                .baseUrl(aiServerUrl)
                .exchangeStrategies(strategies) // 설정 적용
                .build();
    }
}