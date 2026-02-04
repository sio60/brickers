package com.brickers.backend.kids.dto;

import lombok.Data;

@Data
public class KidsPdfResponse {
    private boolean ok;
    private String pdfUrl;
    private String message;
}
