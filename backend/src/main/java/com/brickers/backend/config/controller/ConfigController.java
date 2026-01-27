package com.brickers.backend.config.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @GetMapping("/public")
    public Map<String, Object> publicConfig() {
        return Map.of(
                "upload", Map.of(
                        "maxSize", 10 * 1024 * 1024, // 10MB
                        "allowedTypes", List.of("image/jpeg", "image/png", "image/webp")),
                "features", Map.of(
                        "googlePay", true,
                        "gallery", true));
    }
}
