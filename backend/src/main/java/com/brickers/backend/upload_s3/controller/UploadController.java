package com.brickers.backend.upload_s3.controller;

import com.brickers.backend.upload_s3.dto.UploadResponse;
import com.brickers.backend.upload_s3.entity.UploadFile;
import com.brickers.backend.upload_s3.repository.UploadFileRepository;
import com.brickers.backend.upload_s3.service.StorageService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final StorageService storageService;
    private final CurrentUserService currentUserService;
    private final UploadFileRepository uploadFileRepository;

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResponse uploadImage(
            Authentication authentication,
            @RequestPart("file") MultipartFile file) {
        User me = currentUserService.get(authentication); // 로그인 강제
        var stored = storageService.storeImage(me.getId(), file);

        // ✅ DB에 파일 정보 저장
        UploadFile uploadFile = UploadFile.builder()
                .userId(me.getId())
                .key(stored.url()) // LocalStorage의 경우 url을 key로 활용 가능
                .publicUrl(stored.url())
                .originalName(stored.originalName())
                .contentType(stored.contentType())
                .size(stored.size())
                .createdAt(LocalDateTime.now())
                .build();
        uploadFileRepository.save(uploadFile);

        return UploadResponse.builder()
                .id(uploadFile.getId()) // ID 추가
                .url(stored.url())
                .originalName(stored.originalName())
                .contentType(stored.contentType())
                .size(stored.size())
                .build();
    }

    /** ✅ 업로드 파일 1건 메타 정보 조회 */
    @GetMapping("/files/{fileId}")
    public ResponseEntity<UploadFile> getFileMetadata(@PathVariable String fileId) {
        return uploadFileRepository.findById(fileId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** ✅ 업로드 파일 다운로드 URL 조회 */
    @GetMapping("/files/{fileId}/download-url")
    public ResponseEntity<Map<String, String>> getDownloadUrl(@PathVariable String fileId) {
        return uploadFileRepository.findById(fileId)
                .map(file -> ResponseEntity.ok(Map.of("url", file.getPublicUrl())))
                .orElse(ResponseEntity.notFound().build());
    }
}
