// com.brickers.backend.user.dto.MyProfileUpdateRequest
package com.brickers.backend.user.dto;

import lombok.Data;

@Data
public class MyProfileUpdateRequest {
    private String nickname; // optional
    private String bio; // optional
    private String profileImage; // optional (URL)
}