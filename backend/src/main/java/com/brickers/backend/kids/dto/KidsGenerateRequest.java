package com.brickers.backend.kids.dto;

import lombok.Data;

@Data
public class KidsGenerateRequest {
    private String sourceImageUrl; // S3 URL (Frontend가 직접 업로드한 URL)
    private String age; // "4-5", "6-7", "8-10"
    private int budget; // 브릭 개수
    private String title; // 작업 제목 (파일명)
    private String prompt; // 텍스트 프롬프트 (Optional)
    private String language; // [New] 언어 설정 (ko, en, ja)
}
