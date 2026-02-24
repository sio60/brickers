package com.brickers.backend.kids.service;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.netty.http.client.HttpClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;

import org.springframework.beans.factory.annotation.Value;
import java.time.Duration;

@Component
public class AiRenderClient {

    private final WebClient webClient;

    public AiRenderClient(@Value("${ai.server.url}") String aiServerUrl) {
        int maxBytes = 10 * 1024 * 1024;
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(cfg -> cfg.defaultCodecs().maxInMemorySize(maxBytes))
                .build();

        System.out.println("[AiRenderClient] Initializing with AI server URL: " + aiServerUrl);

        this.webClient = WebClient.builder()
                .baseUrl(aiServerUrl)
                .exchangeStrategies(strategies)
                .clientConnector(new ReactorClientHttpConnector(
                        HttpClient.create().responseTimeout(Duration.ofSeconds(120))))
                .build();
    }

    public java.util.Map<String, Object> generateBackgroundComposite(
            MultipartFile file, String subject) {
        return webClient.post()
                .uri("/api/v1/kids/bg-composite")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData("file", file.getResource())
                        .with("subject", subject))
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<java.util.Map<String, Object>>() {
                })
                .block();
    }
}
