package com.brickers.backend.chat.controller;

import com.brickers.backend.chat.dto.ChatRequest;
import com.brickers.backend.chat.dto.ChatResponse;
import com.brickers.backend.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/query")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        return ResponseEntity.ok(chatService.processChat(request));
    }
}
