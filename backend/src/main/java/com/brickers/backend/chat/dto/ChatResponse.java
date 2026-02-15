package com.brickers.backend.chat.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    private String reply;

    @JsonProperty("conversation_id")
    private String conversationId;

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private List<Object> actions;
}
