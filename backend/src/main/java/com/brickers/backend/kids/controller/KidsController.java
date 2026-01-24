package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.service.KidsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/kids")
@RequiredArgsConstructor
public class KidsController {

    private final KidsService kidsService;

    // React에서 axios.post('/api/kids/generate', formData) 로 호출
    @PostMapping(value = "/generate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> generateBrick(
            @RequestPart("file") MultipartFile file,
            @RequestParam("age") String age,
            @RequestParam("budget") int budget
    ) {
        // 서비스에게 일 시키기
        Map<String, Object> result = kidsService.generateBrick(file, age, budget);
        return ResponseEntity.ok(result);
    }
}