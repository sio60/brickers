package com.brickers.backend.user.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class MyActivityResponse {
    private String type; // "JOB", "POST"
    private LocalDateTime createdAt;
    private Object data; // MyJobResponse or GalleryResponse
}
