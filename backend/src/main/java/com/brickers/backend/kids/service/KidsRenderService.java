package com.brickers.backend.kids.service;

import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.kids.client.AiRenderClient;
import com.brickers.backend.kids.dto.KidsPdfRequest;
import com.brickers.backend.kids.dto.KidsPdfResponse;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

@Service
public class KidsRenderService {

    private final AiRenderClient aiClient;
    private final GenerateJobRepository generateJobRepository;

    public KidsRenderService(AiRenderClient aiClient,
            GenerateJobRepository generateJobRepository) {
        this.aiClient = aiClient;
        this.generateJobRepository = generateJobRepository;
    }

    public String renderOneImage(MultipartFile file) throws Exception {
        if (file.isEmpty() || file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 가능");
        }

        // ✅ 입력 저장 폴더
        Path uploadDir = Path.of(System.getenv().getOrDefault("KIDS_UPLOAD_DIR", "./uploads/kids/in"));
        Files.createDirectories(uploadDir);

        String safeName = (file.getOriginalFilename() == null) ? "upload.png" : file.getOriginalFilename();
        String inName = UUID.randomUUID() + "_" + safeName;
        Path savedIn = uploadDir.resolve(inName);
        file.transferTo(savedIn);

        // ✅ AI 호출 (이미지 bytes)
        byte[] outBytes = aiClient.renderToImageBytes(savedIn);
        if (outBytes == null || outBytes.length == 0) {
            throw new RuntimeException("AI returned empty image");
        }

        // ✅ 출력 저장 폴더
        Path outDir = Path.of(System.getenv().getOrDefault("KIDS_RENDER_DIR", "./uploads/kids/out"));
        Files.createDirectories(outDir);

        String outId = UUID.randomUUID().toString();
        Path outPath = outDir.resolve(outId + ".png"); // 일단 png로 저장(응답 mime이 jpeg여도 bytes 그대로 저장됨)
        Files.write(outPath, outBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

        // ✅ 프론트에서 바로 접근할 URL
        return "/api/kids/rendered/" + outId + ".png";
    }

    public KidsPdfResponse createPdfWithBom(
            KidsPdfRequest request) {
        KidsPdfResponse response = aiClient.createPdfWithBom(request);

        // ✅ 영속화: jobId가 있으면 DB 업데이트
        if (request.getJobId() != null && response != null && response.getPdfUrl() != null) {
            try {
                generateJobRepository.findById(request.getJobId()).ifPresent(job -> {
                    job.setInstructionsPdfUrl(response.getPdfUrl());
                    generateJobRepository.save(job);
                });
            } catch (Exception e) {
                // 로그만 남기고 응답은 보냄
                System.err.println("Failed to save PDF URL to Job: " + e.getMessage());
            }
        }

        return response;
    }
}
