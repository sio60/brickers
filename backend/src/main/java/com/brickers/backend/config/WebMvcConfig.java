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

    @Value("${app.upload.provider:LOCAL}")
    private String uploadProvider;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 1. 로컬 업로드 서빙 (LOCAL 모드일 때만)
        if ("LOCAL".equalsIgnoreCase(uploadProvider)) {
            String uploadPath = Paths.get(uploadDir).toAbsolutePath().toUri().toString();
            System.out.println("📂 [WebMvcConfig] Serving uploads from: " + uploadPath);

            registry.addResourceHandler("/api/uploads/**")
                    .addResourceLocations(uploadPath)
                    .setCachePeriod(3600);
        }
    }
}
