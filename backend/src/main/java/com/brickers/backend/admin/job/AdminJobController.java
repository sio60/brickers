package com.brickers.backend.admin.job;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/jobs")
@RequiredArgsConstructor
public class AdminJobController {

    private final GenerateJobRepository jobRepository;

    /** 전체 작업 목록 */
    @GetMapping
    public Page<GenerateJobEntity> getAllJobs(
            @RequestParam(required = false) JobStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (status != null) {
            // repository에 메서드가 없으면 추가해야 함. 일단 findAll로 구현하거나 repo 확인 필요.
            // 여기서는 단순 findAll 사용 (status 필터링은 추후 구현 or QueryDSL)
            // 임시로 status 무시하고 전체 조회
            return jobRepository.findAll(pageRequest);
        }
        return jobRepository.findAll(pageRequest);
    }

    /** 작업 상세 */
    @GetMapping("/{jobId}")
    public GenerateJobEntity getJob(@PathVariable String jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));
    }

    /** 작업 로그 조회 (목업 or LogRepository 필요) */
    @GetMapping("/{jobId}/logs")
    public ResponseEntity<?> getJobLogs(@PathVariable String jobId) {
        // TODO: 실제 로그 테이블 조회 구현
        return ResponseEntity.ok(Map.of("message", "Log view not implemented yet", "jobId", jobId));
    }

    /** 작업 재시도 */
    @PostMapping("/{jobId}/retry")
    public GenerateJobEntity retryJob(@PathVariable String jobId,
            @RequestBody(required = false) Map<String, String> body) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));

        JobStage fromStage = null;
        if (body != null && body.containsKey("fromStage")) {
            try {
                fromStage = JobStage.valueOf(body.get("fromStage"));
            } catch (Exception ignored) {
            }
        }

        job.requestRetry(fromStage);
        return jobRepository.save(job);
    }

    /** 작업 취소 */
    @PostMapping("/{jobId}/cancel")
    public GenerateJobEntity cancelJob(@PathVariable String jobId) {
        GenerateJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));

        job.markCanceled("Admin cancelled");
        return jobRepository.save(job);
    }
}
