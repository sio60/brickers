package com.brickers.backend.admin.judge;

import com.brickers.backend.admin.judge.dto.JudgeRequest;
import com.brickers.backend.admin.judge.dto.JudgeResponse;
import com.brickers.backend.admin.judge.service.AdminJudgeService;
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
