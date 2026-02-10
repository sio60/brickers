package com.brickers.backend.gallery.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

import com.brickers.backend.gallery.entity.Visibility;

@Data
public class GalleryCreateRequest {
    /** 원본 Job ID (선택적, 중복 등록 방지용) */
    private String jobId;
    private String title;
    private String content;
    private List<String> tags;
    private String thumbnailUrl; // 현재는 URL 문자열만
    private String ldrUrl; // LDR 파일 URL (3D 뷰어용)
    private String sourceImageUrl; // 원본 이미지 URL
    private String glbUrl; // GLB 파일 URL
    private Integer parts; // 최종 브릭 개수
    private Map<String, String> screenshotUrls; // 6면 스크린샷 URL 맵
    private Visibility visibility; // null이면 PUBLIC
}
