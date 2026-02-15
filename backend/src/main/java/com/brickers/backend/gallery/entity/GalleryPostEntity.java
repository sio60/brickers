package com.brickers.backend.gallery.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import com.brickers.backend.job.entity.KidsLevel;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "gallery_posts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryPostEntity {

    @Id
    private String id;

    /** 원본 생성 Job ID (갤러리 등록 시 연결) */
    @Indexed
    private String jobId;

    @Indexed
    private String authorId;

    private String authorNickname;
    private String authorProfileImage;

    private String title;
    private String content;
    private List<String> tags;

    // 업로드 없이 URL만 받는 단계
    private String thumbnailUrl;

    // LDR 파일 URL (3D 뷰어용)
    private String ldrUrl;

    // 원본 이미지 URL (이미지 탭용)
    private String sourceImageUrl;

    // GLB 파일 URL (3D 모델링 탭용)
    private String glbUrl;

    /** 6면 스크린샷 URL 맵 (front, back, left, right, top, bottom) */
    private Map<String, String> screenshotUrls;

    /** 최종 브릭 개수 */
    private Integer parts;

    @Indexed
    private KidsLevel level;
    /** 이미지 분류 카테고리 (Animal, Character 등) */
    private String imageCategory;

    /** 배경 이미지 S3 URL (Nano Banana/Gemini 생성) */
    private String backgroundUrl;

    @Builder.Default
    private Visibility visibility = Visibility.PUBLIC;

    @Builder.Default
    private boolean deleted = false;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private long likeCount = 0;

    @Builder.Default
    private long dislikeCount = 0;

    @Builder.Default
    private long viewCount = 0;

    @Builder.Default
    private long commentCount = 0;
}
