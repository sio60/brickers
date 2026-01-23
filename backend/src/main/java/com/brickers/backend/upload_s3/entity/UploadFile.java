package com.brickers.backend.upload_s3.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "upload_files")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadFile {
    @Id
    private String id;

    private String userId;

    private String key;
    private String publicUrl;

    private String originalName;
    private String contentType;

    private Long size;
    private String etag;

    private LocalDateTime createdAt;
}
