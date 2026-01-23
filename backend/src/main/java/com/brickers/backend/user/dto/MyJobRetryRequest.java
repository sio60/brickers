package com.brickers.backend.user.dto;

import com.brickers.backend.job.entity.JobStage;
import lombok.Data;

/**
 * 실패/중단된 작업을 특정 단계부터 다시 시도하고 싶을 때 사용
 */
@Data
public class MyJobRetryRequest {
    private JobStage fromStage; // null이면 현재 stage(또는 실패 stage)부터
}
