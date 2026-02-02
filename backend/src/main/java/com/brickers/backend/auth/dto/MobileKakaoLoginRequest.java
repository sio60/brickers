package com.brickers.backend.auth.dto;

import lombok.Data;

@Data
public class MobileKakaoLoginRequest {
    private String kakaoAccessToken;
}
