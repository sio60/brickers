package com.brickers.backend.user.dto;

import com.brickers.backend.gallery.dto.GalleryResponse;
import com.brickers.backend.user.dto.MySettingsResponse;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MyOverviewResponse {

    private MySettingsResponse settings;

    private GalleryOverview gallery;
    private JobsOverview jobs;

    @Data
    @Builder
    public static class GalleryOverview {
        private long totalCount;
        private List<GalleryResponse> recent; // 최근 6개
    }

    @Data
    @Builder
    public static class JobsOverview {
        private long totalCount;
        private List<MyJobResponse> recent; // 최근 6개
    }
}
