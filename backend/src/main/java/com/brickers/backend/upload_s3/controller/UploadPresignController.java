package com.brickers.backend.upload_s3.controller;

import com.brickers.backend.upload_s3.dto.*;
import com.brickers.backend.upload_s3.service.UploadCompleteService;
import com.brickers.backend.upload_s3.service.UploadPresignService;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadPresignController {

    private final UploadPresignService presignService;
    private final UploadCompleteService completeService;
    private final CurrentUserService currentUserService;

    @PostMapping("/presign")
    public ResponseEntity<PresignResponse> presign(
            Authentication auth,
            @RequestBody PresignRequest req) {
        User me = currentUserService.get(auth);
        PresignResponse res = presignService.presignImageUpload(
                me.getId(),
                req.contentType(),
                req.originalName());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/complete")
    public ResponseEntity<UploadCompleteResponse> complete(
            Authentication auth,
            @RequestBody UploadCompleteRequest req) {
        User me = currentUserService.get(auth);
        UploadCompleteResponse res = completeService.complete(me.getId(), req);
        return ResponseEntity.ok(res);
    }
}
