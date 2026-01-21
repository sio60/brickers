package com.brickers.backend.user.controller;

import com.brickers.backend.user.dto.DeleteMyAccountResponse;
import com.brickers.backend.user.dto.MyMembershipResponse;
import com.brickers.backend.user.dto.MyProfileResponse;
import com.brickers.backend.user.dto.MyProfileUpdateRequest;
import com.brickers.backend.user.service.MyService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/my")
@RequiredArgsConstructor
public class MyController {

    private final MyService myService;

    @PatchMapping("/profile")
    public MyProfileResponse updateMyProfile(
            OAuth2AuthenticationToken auth,
            @RequestBody MyProfileUpdateRequest req) {
        return myService.updateMyProfile(auth, req);
    }

    @GetMapping("/membership")
    public MyMembershipResponse getMyMembership(OAuth2AuthenticationToken auth) {
        return myService.getMyMembership(auth);
    }

    @DeleteMapping("/account")
    public DeleteMyAccountResponse deleteMyAccount(OAuth2AuthenticationToken auth) {
        return myService.requestDeleteMyAccount(auth);
    }
}
