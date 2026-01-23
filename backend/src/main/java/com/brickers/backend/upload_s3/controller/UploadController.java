package com.brickers.backend.upload_s3.controller;

import com.brickers.backend.upload_s3.dto.UploadResponse;
import com.brickers.backend.upload_s3.service.StorageService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final StorageService storageService;
    private final CurrentUserService currentUserService;

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResponse uploadImage(
            Authentication authentication,
            @RequestPart("file") MultipartFile file) {
        User me = currentUserService.get(authentication); // 로그인 강제
        var stored = storageService.storeImage(me.getId(), file);

        return UploadResponse.builder()
                .url(stored.url())
                .originalName(stored.originalName())
                .contentType(stored.contentType())
                .size(stored.size())
                .build();
    }
}
