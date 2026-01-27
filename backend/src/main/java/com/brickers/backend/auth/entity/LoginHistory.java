package com.brickers.backend.auth.entity;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "login_histories")
@Data
@Builder
public class LoginHistory {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String ipAddress;
    private String userAgent;

    @Builder.Default
    private LocalDateTime loginAt = LocalDateTime.now();

}
