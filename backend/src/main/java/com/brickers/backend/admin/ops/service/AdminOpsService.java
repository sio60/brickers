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
        // Mock logic preserved as per original verification plan, utilizing real counts
        status.put("activeWorkers", "Unknown (Worker metrics not connected)");
        status.put("pendingJobs", jobRepository.countByStatus(JobStatus.QUEUED));
        status.put("runningJobs", jobRepository.countByStatus(JobStatus.RUNNING));

        // Example logic for failed in 24h:
        // status.put("failedJobs24h",
        // jobRepository.countByStatusAndUpdatedAtAfter(JobStatus.FAILED,
        // LocalDateTime.now().minusHours(24)));
        // Assuming we added the repo method

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
