package com.brickers.backend.admin.controller;

import com.brickers.backend.admin.dto.JudgeRequest;
import com.brickers.backend.admin.dto.JudgeResponse;
import com.brickers.backend.admin.service.AdminJudgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/judge")
@RequiredArgsConstructor
public class AdminJudgeController {

    private final AdminJudgeService adminJudgeService;

    @PostMapping
    public JudgeResponse judge(@RequestBody JudgeRequest req) {
        return adminJudgeService.judge(req.getLdrUrl());
    }
}
