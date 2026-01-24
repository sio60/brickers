package com.brickers.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.upload.root-dir:./uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 로컬 업로드 경로를 file URL 포맷으로 변환
        String uploadPath = Paths.get(uploadDir).toAbsolutePath().toUri().toString();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath);

        // ✅ AI 생성 결과물 서빙 (brickers-ai/public/generated 폴더)
        // backend 실행 위치(root) 기준 상위 폴더 접근
        String generatedPath = Paths.get("../brickers-ai/public/generated").toAbsolutePath().toUri().toString();
        registry.addResourceHandler("/api/generated/**")
                .addResourceLocations(generatedPath);
    }
}
