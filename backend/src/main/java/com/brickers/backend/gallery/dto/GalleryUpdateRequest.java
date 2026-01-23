package com.brickers.backend.gallery.dto;

import lombok.Data;

import java.util.List;

import com.brickers.backend.gallery.entity.Visibility;

@Data
public class GalleryUpdateRequest {
    private String title;
    private String content;
    private List<String> tags;
    private String thumbnailUrl;
    private Visibility visibility;
}
