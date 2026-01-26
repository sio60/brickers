package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.service.KidsRenderService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api/kids")
public class KidsRenderController {

    private final KidsRenderService service;

    public KidsRenderController(KidsRenderService service) {
        this.service = service;
    }

    @PostMapping(value = "/render", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> render(@RequestPart("file") MultipartFile file) {
        try {
            String imageUrl = service.renderOneImage(file);
            return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
        } catch (Exception e) {
            // ✅ 프론트에 원인 보이게
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/rendered/{filename}")
    public ResponseEntity<byte[]> getRenderedImage(@PathVariable("filename") String filename) {
        try {
            Path outDir = Paths.get(System.getenv().getOrDefault("KIDS_RENDER_DIR", "./uploads/kids/out"));
            Path filePath = outDir.resolve(filename).normalize();
            if (!filePath.startsWith(outDir)) {
                return ResponseEntity.status(403).build();
            }

            System.out.println("[KidsRenderController] Requested: " + filename);
            System.out.println("[KidsRenderController] Resolved path: " + filePath.toAbsolutePath());

            if (!java.nio.file.Files.exists(filePath) || !java.nio.file.Files.isReadable(filePath)) {
                System.out.println("[KidsRenderController] File not found or not readable");
                return ResponseEntity.notFound().build();
            }

            byte[] data = java.nio.file.Files.readAllBytes(filePath);
            System.out.println("[KidsRenderController] Read " + data.length + " bytes. Serving now.");

            // 매직 넘버 확인용 로그
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < Math.min(data.length, 10); i++) {
                sb.append(String.format("%02X ", data[i]));
            }
            System.out.println("[KidsRenderController] File Header (Hex): " + sb.toString());

            // 매직 넘버로 실제 타입 확인
            MediaType mediaType = MediaType.IMAGE_PNG;
            if (data.length > 1 && data[0] == (byte) 0xFF && data[1] == (byte) 0xD8) {
                mediaType = MediaType.IMAGE_JPEG;
                System.out.println("[KidsRenderController] Detected JPEG header");
            } else if (data.length > 8 &&
                    data[0] == (byte) 0x89 && data[1] == (byte) 0x50 &&
                    data[2] == (byte) 0x4E && data[3] == (byte) 0x47) {
                mediaType = MediaType.IMAGE_PNG;
                System.out.println("[KidsRenderController] Detected PNG header");
            } else {
                // 확장자로 fallback
                System.out.println("[KidsRenderController] Unknown header, using extension fallback");
                if (filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) {
                    mediaType = MediaType.IMAGE_JPEG;
                }
            }

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    // 캐시 제어 (선택 사항)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                    .body(data);

        } catch (Exception e) {
            System.out.println("[KidsRenderController] Error serving file: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
