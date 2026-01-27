package com.brickers.backend.job.dto;

import lombok.Data;

@Data
public class UpdateResultsRequest {
    private String previewImageUrl;
    private String modelKey;
    private String blueprintPdfKey;
    private String bomKey;
}
