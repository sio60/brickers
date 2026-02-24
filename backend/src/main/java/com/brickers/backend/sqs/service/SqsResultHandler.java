package com.brickers.backend.sqs.service;

import com.brickers.backend.kids.service.KidsJobResultService;
import com.brickers.backend.sqs.dto.SqsMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 🛠️ SqsResultHandler
 * 
 * SQS로부터 수신된 AI 처리 결과(RESULT)를 바탕으로
 * GenerateJobEntity를 업데이트하고 정책에 따른 후처리를 담당합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SqsResultHandler {

    private final KidsJobResultService kidsJobResultService;

    @Transactional
    public void handleResult(SqsMessage result) {
        kidsJobResultService.applySqsResult(result);
    }
}
