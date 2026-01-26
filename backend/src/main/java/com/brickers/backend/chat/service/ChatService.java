package com.brickers.backend.chat.service;

import com.brickers.backend.chat.dto.ChatRequest;
import com.brickers.backend.chat.dto.ChatResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    @Value("${openai.api-key}")
    private String openAiApiKey;

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    public ChatResponse processChat(ChatRequest request) {
        RestClient client = RestClient.builder()
                .baseUrl(OPENAI_URL)
                .defaultHeader("Authorization", "Bearer " + openAiApiKey)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();

        // 시스템 프롬프트: 사용자가 레고 변환 서비스 'BrickBot'과 대화 중임을 인지
        var messages = List.of(
                Map.of("role", "system", "content",
                        """
                                You are 'BrickBot', a kind and friendly AI guide for 'Brickers'.

                                [Persona]
                                - Tone: Very polite, warm, and encouraging (Korean '존댓말', e.g., '해요', '할까요?').
                                - Role: Help users create Lego models from photos or explore the gallery.
                                - If the user seems lost or asks "what can I do?", guide them with specific actions.

                                [Actions]
                                You can suggest navigation buttons by appending these exact tags at the end of your response:
                                - If the user wants to make/create Lego: append " {{NAV_CREATE}}"
                                - If the user wants to see others' works: append " {{NAV_GALLERY}}"
                                - If the user asks about their account/page: append " {{NAV_MYPAGE}}"

                                [Examples]
                                User: "이거 어떻게 해?"
                                Bot: "원하시는 사진을 올려주시면 멋진 레고로 만들어드릴게요! 한번 시작해보시겠어요? {{NAV_CREATE}}"

                                User: "심심해"
                                Bot: "다른 친구들이 만든 멋진 작품들을 구경하러 가볼까요? {{NAV_GALLERY}}"
                                """),
                Map.of("role", "user", "content", request.getMessage()));

        Map<String, Object> body = Map.of(
                "model", "gpt-4o",
                "messages", messages,
                "temperature", 0.7);

        try {
            Map<String, Object> response = client.post()
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> choice = choices.get(0);
                    Map<String, Object> message = (Map<String, Object>) choice.get("message");
                    String content = (String) message.get("content");
                    return new ChatResponse(content);
                }
            }
        } catch (Exception e) {
            log.error("OpenAI API call failed", e);
            return new ChatResponse("죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요! 🤖");
        }

        return new ChatResponse("음? 답변을 가져오지 못했어요.");
    }
}
