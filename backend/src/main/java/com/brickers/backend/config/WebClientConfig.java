package com.brickers.backend.config;

import io.netty.channel.ChannelOption;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
@Slf4j
public class WebClientConfig {

    @Bean
    public WebClient aiWebClient(
            @Value("${AI_SERVER_URL}") String aiServerUrl,
            @Value("${KIDS_AI_WEBCLIENT_RESPONSE_TIMEOUT_SEC:950}") long responseTimeoutSec
    ) {
        // ✅ Netty 레벨 타임아웃 (Spring block timeout보다 약간 크게)
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10_000)
                .responseTimeout(Duration.ofSeconds(responseTimeoutSec));

        // ✅ GLB/이미지/ldr 내려받을 때 메모리 제한 넉넉히
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(cfg -> cfg.defaultCodecs().maxInMemorySize(50 * 1024 * 1024)) // 50MB
                .build();

        log.info("[WebClientConfig] AI_SERVER_URL={}", aiServerUrl);

        return WebClient.builder()
                .baseUrl(aiServerUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(strategies)
                .build();
    }
}
