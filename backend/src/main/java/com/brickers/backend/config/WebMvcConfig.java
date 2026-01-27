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
        // ✅ 배포 환경(S3)에서는 백엔드가 파일을 서빙하지 않음
        if (!"LOCAL".equalsIgnoreCase(uploadProvider)) {
            return;
        }

        // 로컬 업로드 경로를 file URL 포맷으로 변환
        String uploadPath = Paths.get(uploadDir).toAbsolutePath().toUri().toString();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath)
                .setCachePeriod(3600);

        // ✅ AI 생성 결과물 서빙 (brickers-ai/public/generated 폴더)
        // backend 실행 위치(root) 기준 상위 폴더 접근 (backend -> brickers -> finalproj ->
        // brickers-ai)
        String generatedPath = Paths.get("../../brickers-ai/public/generated").toAbsolutePath().toUri().toString();
        registry.addResourceHandler("/api/generated/**")
                .addResourceLocations(generatedPath);
    }
}
