package com.brickers.backend.admin.blueprint.service;

import com.brickers.backend.admin.blueprint.dto.BlueprintLogDto;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * 도안 생성 로그 관리 서비스
 */
@Service
@RequiredArgsConstructor
public class AdminBlueprintService {

    private final GenerateJobRepository jobRepository;

    /**
     * 도안 생성 로그 조회 (실패 분석용)
     */
    public Page<BlueprintLogDto> getLogs(int page, int size, JobStatus status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (status != null) {
            return jobRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                    .map(BlueprintLogDto::from);
        }

        return jobRepository.findAll(pageable)
                .map(BlueprintLogDto::from);
    }

    /**
     * 실패한 작업만 조회
     */
    public Page<BlueprintLogDto> getFailedLogs(int page, int size) {
        return getLogs(page, size, JobStatus.FAILED);
    }
}
