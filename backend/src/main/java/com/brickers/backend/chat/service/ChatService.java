package com.brickers.backend.chat.service;

import com.brickers.backend.chat.dto.ChatRequest;
import com.brickers.backend.chat.dto.ChatResponse;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class ChatService {

        private final WebClient aiWebClient; // ✅ FastAPI 호출용 WebClient

        public ChatResponse processChat(ChatRequest request) {

                // FastAPI 요청 DTO (conversation_id 이름 맞추기)
                // [Modified] Inject System Prompt about service details
                String systemNote = """
                                [System Note] If asked about brick counts, please answer based on the following:
                                - Level 1: 100+ bricks (varies by resolution)
                                - Level 2: 150+ bricks
                                - Level 3: 200+ bricks
                                - Pro: 1000+ bricks

                                User Message:
                                """;

                AiChatRequest aiReq = new AiChatRequest(
                                systemNote + request.getMessage(),
                                request.getLanguage(),
                                request.getConversationId());

                AiChatResponse aiRes = aiWebClient.post()
                                .uri("/api/chat/query")
                                .contentType(MediaType.APPLICATION_JSON)
                                .bodyValue(aiReq)
                                .retrieve()
                                .bodyToMono(AiChatResponse.class)
                                .block(Duration.ofSeconds(35));

                return new ChatResponse(aiRes.content(), aiRes.conversationId());
        }

        // ---- 내부 DTO ----
        public record AiChatRequest(
                        String message,
                        String language,
                        @JsonProperty("conversation_id") String conversationId) {
        }

        public record AiChatResponse(
                        String content,
                        @JsonProperty("conversation_id") String conversationId) {
        }
}
