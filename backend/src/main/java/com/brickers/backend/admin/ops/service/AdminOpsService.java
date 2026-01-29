package com.brickers.backend.admin.ops.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminOpsService {

    private final GenerateJobRepository jobRepository;
    private final CacheManager cacheManager;

    public Map<String, Object> getQueueStatus() {
        Map<String, Object> status = new HashMap<>();

        // ✅ 실제 데이터 조회
        long pendingJobs = jobRepository.countByStatus(JobStatus.QUEUED);
        long runningJobs = jobRepository.countByStatus(JobStatus.RUNNING);
        long failedJobs24h = jobRepository.countByStatusAndUpdatedAtAfter(
                JobStatus.FAILED, LocalDateTime.now().minusHours(24));

        status.put("activeWorkers", runningJobs > 0 ? runningJobs + " 작업 실행 중" : "대기 중");
        status.put("pendingJobs", pendingJobs);
        status.put("runningJobs", runningJobs);
        status.put("failedJobs24h", failedJobs24h);
        status.put("lastUpdated", LocalDateTime.now());

        return status;
    }

    public Map<String, Object> getBlueprintLogs(int page, int size) {
        Page<GenerateJobEntity> failedJobs = jobRepository.findByStatusOrderByCreatedAtDesc(
                JobStatus.FAILED,
                PageRequest.of(page, size));

        return Map.of(
                "note", "Displaying recent FAILED jobs from DB",
                "logs", failedJobs.getContent().stream()
                        .map(j -> Map.of(
                                "jobId", j.getId(),
                                "userId", j.getUserId(),
                                "error", j.getErrorMessage() == null ? "Unknown error" : j.getErrorMessage(),
                                "time", j.getUpdatedAt()))
                        .toList(),
                "totalFailed", failedJobs.getTotalElements(),
                "totalPages", failedJobs.getTotalPages());
    }

    public Map<String, Object> clearCache() {
        int count = 0;
        for (String name : cacheManager.getCacheNames()) {
            Cache cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
                count++;
            }
        }
        return Map.of("message", "System cache cleared", "clearedCaches", count);
    }
}
