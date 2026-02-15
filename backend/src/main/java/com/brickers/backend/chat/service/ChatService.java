package com.brickers.backend.chat.service;

import com.brickers.backend.chat.dto.ChatRequest;
import com.brickers.backend.chat.dto.ChatResponse;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ChatService {

    private static final Duration AI_TIMEOUT = Duration.ofSeconds(35);
    private static final Pattern DYNAMIC_NAV_PATTERN = Pattern.compile("\\{\\{NAV:([^}]+)}}");
    private static final Map<String, String> TOKEN_TO_ACTION = Map.of(
            "{{NAV_CREATE}}", "create",
            "{{NAV_GALLERY}}", "gallery",
            "{{NAV_MYPAGE}}", "mypage",
            "{{NAV_INQUIRIES}}", "inquiries",
            "{{NAV_REPORTS}}", "reports",
            "{{NAV_REFUNDS}}", "refunds",
            "{{NAV_JOBS}}", "jobs");

    private final WebClient aiWebClient;

    public ChatResponse processChat(ChatRequest request) {
        String systemNote = """
                [System Note] If asked about brick counts, please answer based on the following:
                - Level 1: 100+ bricks (varies by resolution)
                - Level 2: 200+ bricks
                - Level 3: 300+ bricks
                - Pro: 1000+ bricks

                [Navigation Rule]
                If the user asks to move to a specific page, append one nav token at the end of the answer.
                Available tokens:
                - {{NAV_CREATE}} => /kids/main
                - {{NAV_GALLERY}} => /gallery
                - {{NAV_MYPAGE}} => /mypage
                - {{NAV_INQUIRIES}} => /mypage?menu=inquiries
                - {{NAV_REPORTS}} => /mypage?menu=reports
                - {{NAV_REFUNDS}} => /mypage?menu=refunds
                - {{NAV_JOBS}} => /mypage?menu=jobs

                User Message:
                """;

        AiChatRequest aiReq = new AiChatRequest(
                systemNote + safeText(request.getMessage()),
                request.getLanguage(),
                request.getConversationId());

        AiChatResponse aiRes = aiWebClient.post()
                .uri("/api/chat/query")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(aiReq)
                .retrieve()
                .bodyToMono(AiChatResponse.class)
                .block(AI_TIMEOUT);

        if (aiRes == null) {
            return ChatResponse.builder()
                    .reply("")
                    .conversationId(request.getConversationId())
                    .build();
        }

        String reply = safeText(aiRes.content());
        List<Object> actions = mergeActions(reply, aiRes.actions());
        String conversationId = aiRes.conversationId() != null
                ? aiRes.conversationId()
                : request.getConversationId();

        return ChatResponse.builder()
                .reply(reply)
                .conversationId(conversationId)
                .actions(actions.isEmpty() ? null : actions)
                .build();
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }

    private List<Object> mergeActions(String reply, List<Object> aiActions) {
        List<Object> merged = new ArrayList<>();
        Set<String> dedupe = new LinkedHashSet<>();

        if (aiActions != null) {
            for (Object item : aiActions) {
                String normalized = normalizeAction(item);
                if (normalized == null) {
                    continue;
                }
                if (dedupe.add(normalized)) {
                    merged.add(normalized);
                }
            }
        }

        for (Map.Entry<String, String> entry : TOKEN_TO_ACTION.entrySet()) {
            if (reply.contains(entry.getKey()) && dedupe.add(entry.getValue())) {
                merged.add(entry.getValue());
            }
        }

        Matcher matcher = DYNAMIC_NAV_PATTERN.matcher(reply);
        while (matcher.find()) {
            String mapped = actionFromTarget(matcher.group(1));
            if (mapped != null && dedupe.add(mapped)) {
                merged.add(mapped);
            }
        }

        return merged;
    }

    private String normalizeAction(Object rawAction) {
        if (rawAction instanceof String value) {
            String fromName = actionFromName(value);
            if (fromName != null) {
                return fromName;
            }
            return actionFromTarget(value);
        }

        if (rawAction instanceof Map<?, ?> map) {
            Object action = map.get("action");
            if (action instanceof String value) {
                String fromName = actionFromName(value);
                if (fromName != null) {
                    return fromName;
                }
            }

            Object name = map.get("name");
            if (name instanceof String value) {
                String fromName = actionFromName(value);
                if (fromName != null) {
                    return fromName;
                }
            }

            Object target = map.get("target");
            if (target instanceof String value) {
                return actionFromTarget(value);
            }
        }

        return null;
    }

    private String actionFromName(String name) {
        String normalized = name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "create", "gallery", "mypage", "inquiries", "reports", "refunds", "jobs" -> normalized;
            default -> null;
        };
    }

    private String actionFromTarget(String target) {
        String normalized = target == null ? "" : target.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "/kids/main" -> "create";
            case "/gallery" -> "gallery";
            case "/mypage" -> "mypage";
            case "/mypage?menu=inquiries" -> "inquiries";
            case "/mypage?menu=reports" -> "reports";
            case "/mypage?menu=refunds" -> "refunds";
            case "/mypage?menu=jobs" -> "jobs";
            default -> null;
        };
    }

    public record AiChatRequest(
            String message,
            String language,
            @JsonProperty("conversation_id") String conversationId) {
    }

    public record AiChatResponse(
            String content,
            @JsonProperty("conversation_id") String conversationId,
            List<Object> actions) {
    }
}
