package com.brickers.backend.system.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Slf4j
public class SystemController {

    @GetMapping("/health")
    public String health() {
        return "OK";
    }

    @GetMapping("/version")
    public Map<String, String> version() {
        return Map.of("version", "1.0.0");
    }

    @PostMapping("/errors")
    public void reportError(@RequestBody Map<String, Object> errorData) {
        log.error("Frontend Error Report: {}", errorData);
    }
}
