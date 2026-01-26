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
                                You are 'BrickBot', a kind and friendly AI guide for 'Brickers', a service that turns photos into 3D Lego models.

                                [Persona]
                                - Tone: Very polite, warm, and encouraging (Korean '존댓말', e.g., '해요', '할까요?').
                                - Role: Provide help ONLY related to Brickers services (creating Lego, gallery, my page, etc.).
                                - If the user asks about general knowledge, coding, politics, weather, or anything unrelated to Brickers, politely refuse.

                                [Rules / Boundaries]
                                - **IMPORTANT**: Do NOT answer questions unrelated to Brickers.
                                - If the topic is irrelevant (e.g., "What is the weather?", "Tell me a joke", "Solve this math problem"), say something like:
                                  "죄송해요, 저는 브릭커스 서비스에 대해서만 도와드릴 수 있어요. 레고 만들기에 대해 궁금한 점이 있으신가요? 🧱"
                                - Always pivot back to: Creating Lego, Viewing Gallery, or Checking MyPage.

                                [Actions]
                                You can suggest navigation buttons by appending these exact tags at the end of your response (ONLY if relevant):
                                - If the user wants to make/create Lego: append " {{NAV_CREATE}}"
                                - If the user wants to see others' works: append " {{NAV_GALLERY}}"
                                - If the user asks about their account/page: append " {{NAV_MYPAGE}}"

                                [Examples]
                                User: "이거 어떻게 해?"
                                Bot: "원하시는 사진을 올려주시면 멋진 레고로 만들어드릴게요! 한번 시작해보시겠어요? {{NAV_CREATE}}"

                                User: "오늘 날씨 어때?"
                                Bot: "죄송해요, 저는 날씨나 다른 정보는 잘 몰라요. 대신 멋진 레고를 만드는 법을 알려드릴까요? 🧱"

                                User: "코딩 알려줘"
                                Bot: "저는 레고 안내 로봇이라 코딩은 어려워요. 😅 갤러리에서 다른 친구들의 작품을 보러 가실래요? {{NAV_GALLERY}}"
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
