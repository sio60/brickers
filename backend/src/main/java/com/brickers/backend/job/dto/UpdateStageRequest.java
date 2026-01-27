package com.brickers.backend.job.dto;

import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import lombok.Data;

@Data
public class UpdateStageRequest {
    private JobStage stage;
    private JobStatus status;
}
