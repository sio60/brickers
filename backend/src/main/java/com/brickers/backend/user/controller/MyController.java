package com.brickers.backend.user.controller;

import com.brickers.backend.user.MySettingsResponse;
import com.brickers.backend.user.dto.*;
import com.brickers.backend.user.service.MyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/membership/upgrade")
    public MyMembershipResponse upgradeMembership(Authentication authentication) {
        return myService.upgradeMembership(authentication);
    }

    @DeleteMapping("/account")
    public DeleteMyAccountResponse deleteMyAccount(Authentication authentication) {
        return myService.requestDeleteMyAccount(authentication);
    }

    @GetMapping("/settings")
    public MySettingsResponse mySettings(Authentication authentication) {
        return myService.getMySettings(authentication);
    }

    /** ✅ 내 생성 작업 목록 */
    @GetMapping("/jobs")
    public Page<MyJobResponse> myJobs(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return myService.listMyJobs(authentication, page, size);
    }

    /** ✅ 마이페이지 한 번에 로드 */
    @GetMapping("/overview")
    public MyOverviewResponse myOverview(Authentication authentication) {
        return myService.getMyOverview(authentication);
    }

    /** ✅ (코어 전) job 재시도 요청 */
    @PostMapping("/jobs/{jobId}/retry")
    public MyJobResponse retry(
            Authentication authentication,
            @PathVariable String jobId,
            @RequestBody(required = false) MyJobRetryRequest req) {
        return myService.retryJob(authentication, jobId, req);
    }
}
