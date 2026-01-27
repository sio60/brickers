package com.brickers.backend.job.controller;

import com.brickers.backend.job.dto.*;
import com.brickers.backend.job.service.GenerateJobService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/internal/jobs")
@RequiredArgsConstructor
public class InternalJobController {

    private final GenerateJobService jobService;

    @PostMapping("/{jobId}/stage")
    public void updateStage(@PathVariable String jobId, @RequestBody UpdateStageRequest req) {
        jobService.updateStage(jobId, req.getStage(), req.getStatus());
    }

    @PostMapping("/{jobId}/results")
    public void updateResults(@PathVariable String jobId, @RequestBody UpdateResultsRequest req) {
        jobService.updateResults(jobId, req);
    }

    @PostMapping("/{jobId}/fail")
    public void reportFail(@PathVariable String jobId, @RequestBody ReportFailRequest req) {
        jobService.markFailed(jobId, req.getMessage());
    }
}
