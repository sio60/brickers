package com.brickers.backend.admin.ops;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/ops")
@RequiredArgsConstructor
public class AdminOpsController {

    private final GenerateJobRepository jobRepository;
    private final org.springframework.cache.CacheManager cacheManager;

    /** 큐 상태 모니터링 (Mock preserved as per plan, refined with DB stats) */
    @GetMapping("/queue")
    public Map<String, Object> getQueueStatus() {
        Map<String, Object> status = new HashMap<>();
        // 워커 상태는 별도 모니터링 시스템 없이 알기 어려우므로 Mock 유지하되 코멘트 추가
        status.put("activeWorkers", "Unknown (Worker metrics not connected)");
        status.put("pendingJobs", jobRepository.countByStatus(com.brickers.backend.job.entity.JobStatus.QUEUED));
        status.put("runningJobs", jobRepository.countByStatus(com.brickers.backend.job.entity.JobStatus.RUNNING));
        status.put("failedJobs24h", "TODO: Add repository query if needed"); // Simple count
        status.put("lastUpdated", LocalDateTime.now());
        return status;
    }

    /** 도안 생성 로그 조회 (Real - Failed Jobs from DB) */
    @GetMapping("/logs/blueprints")
    public ResponseEntity<?> getBlueprintLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        // 최근 실패한 작업들을 로그 대용으로 반환
        // 실제 로그 파일 접근은 보안/구성상 복잡하므로 DB 에러 메시지 활용
        // Repository에 메서드 추가 필요: findByStatusOrderByCreatedAtDesc

        // 임시로 전체 조회 후 필터링하거나, Repostiory 메서드 추가 후 호출
        // 여기서는 Repository 메서드 추가 없이 PageRequest 이용한 전체 중 FAILED 필터링 권장되지만,
        // 성능상 Repository 메서드 추가가 나음.
        // 일단 사용자 요청에 따라 "작동 안하는 코드"를 수정하는 것이므로
        // Repository에 쿼리 메서드 추가했다고 가정하고 호출 코드 작성 (이후 추가)

        // return
        // ResponseEntity.ok(jobRepository.findByStatusOrderByCreatedAtDesc(JobStatus.FAILED,
        // PageRequest.of(page, size)));

        // Efficient DB Query
        Page<GenerateJobEntity> failedJobs = jobRepository
                .findByStatusOrderByCreatedAtDesc(
                        JobStatus.FAILED,
                        PageRequest.of(page, size));

        return ResponseEntity.ok(Map.of(
                "note", "Displaying recent FAILED jobs from DB",
                "logs", failedJobs.getContent().stream()
                        .map(j -> Map.of(
                                "jobId", j.getId(),
                                "userId", j.getUserId(),
                                "error", j.getErrorMessage() == null ? "Unknown error" : j.getErrorMessage(),
                                "time", j.getUpdatedAt()))
                        .toList(),
                "totalFailed", failedJobs.getTotalElements(),
                "totalPages", failedJobs.getTotalPages()));
    }

    /** 시스템 캐시 초기화 (Real) */
    @PostMapping("/cache/clear")
    public ResponseEntity<?> clearCache() {
        int count = 0;
        for (String name : cacheManager.getCacheNames()) {
            org.springframework.cache.Cache cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
                count++;
            }
        }
        return ResponseEntity.ok(Map.of("message", "System cache cleared", "clearedCaches", count));
    }
}
