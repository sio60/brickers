package com.brickers.backend.kids.client;

import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.netty.http.client.HttpClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;

import java.nio.file.Path;
import java.time.Duration;

@Component
public class AiRenderClient {

    private final WebClient webClient;

    public AiRenderClient() {
        int maxBytes = 10 * 1024 * 1024; // ✅ 10MB (필요하면 20MB로)
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(cfg -> cfg.defaultCodecs().maxInMemorySize(maxBytes))
                .build();

        this.webClient = WebClient.builder()
                .baseUrl(System.getenv().getOrDefault("AI_BASE_URL", "http://localhost:8000"))
                .exchangeStrategies(strategies)
                .clientConnector(new ReactorClientHttpConnector(
                        HttpClient.create().responseTimeout(Duration.ofSeconds(120))
                ))
                .build();
    }

    public byte[] renderToImageBytes(Path imagePath) {
        FileSystemResource file = new FileSystemResource(imagePath.toFile());

        return webClient.post()
                .uri("/v1/kids/render-image") // ✅ FastAPI 라우트와 일치
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData("file", file))
                .retrieve()
                .bodyToMono(byte[].class)
                .block();
    }
}
