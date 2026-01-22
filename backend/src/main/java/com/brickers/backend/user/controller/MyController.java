package com.brickers.backend.user.controller;

import com.brickers.backend.user.dto.DeleteMyAccountResponse;
import com.brickers.backend.user.dto.MyMembershipResponse;
import com.brickers.backend.user.dto.MyProfileResponse;
import com.brickers.backend.user.dto.MyProfileUpdateRequest;
import com.brickers.backend.user.service.MyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/my")
@RequiredArgsConstructor
public class MyController {

    private final MyService myService;

    @GetMapping("/profile")
    public MyProfileResponse getMyProfile(Authentication authentication) {
        return myService.getMyProfile(authentication);
    }

    @PatchMapping("/profile")
    public MyProfileResponse updateMyProfile(
            Authentication authentication,
            @RequestBody MyProfileUpdateRequest req) {
        return myService.updateMyProfile(authentication, req);
    }

    @GetMapping("/membership")
    public MyMembershipResponse getMyMembership(Authentication authentication) {
        return myService.getMyMembership(authentication);
    }

    @DeleteMapping("/account")
    public DeleteMyAccountResponse deleteMyAccount(Authentication authentication) {
        return myService.requestDeleteMyAccount(authentication);
    }
}
