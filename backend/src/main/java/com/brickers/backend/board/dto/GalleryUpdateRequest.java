package com.brickers.backend.board.dto;

import com.brickers.backend.board.entity.Visibility;
import lombok.Data;

import java.util.List;

@Data
public class GalleryUpdateRequest {
    private String title;
    private String content;
    private List<String> tags;
    private String thumbnailUrl;
    private Visibility visibility;
}
