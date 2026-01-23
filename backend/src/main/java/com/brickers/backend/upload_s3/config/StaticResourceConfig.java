package com.brickers.backend.upload_s3.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Value("${app.upload.root-dir:./uploads}")
    private String rootDir;

    @Value("${app.upload.public-prefix:/uploads}")
    private String publicPrefix;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path dir = Paths.get(rootDir).toAbsolutePath().normalize();
        String location = dir.toUri().toString(); // "file:/C:/.../uploads/"

        registry.addResourceHandler(publicPrefix + "/**")
                .addResourceLocations(location)
                .setCachePeriod(3600);
    }
}
