package com.brickers.backend.board.dto;

import com.brickers.backend.board.entity.Visibility;
import lombok.Data;

import java.util.List;

@Data
public class GalleryCreateRequest {
    private String title;
    private String content;
    private List<String> tags;
    private String thumbnailUrl; // 현재는 URL 문자열만
    private Visibility visibility; // null이면 PUBLIC
}
