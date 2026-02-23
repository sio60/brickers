package com.brickers.backend.admin.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ModerationItemDto {
    private String id;
    private String type; // "post" or "comment"
    private String content;
    private String authorId;
    private String authorNickname;
    private LocalDateTime createdAt;
}
