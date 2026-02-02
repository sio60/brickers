package com.brickers.backend.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MobileLoginResponse {
    private String accessToken;
    private String refreshToken;
    private MobileUserInfo user;

    @Data
    @Builder
    public static class MobileUserInfo {
        private String id;
        private String nickname;
        private String email;
        private String profileImage;
        private String role;
    }
}
