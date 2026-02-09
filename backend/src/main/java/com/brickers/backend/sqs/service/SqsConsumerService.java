package com.brickers.backend.sqs.service;

import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.sqs.dto.SqsMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * SQS Consumer Service
 * - RESULT Queue에서 AI Server 처리 결과 수신
 * - GenerateJobEntity 업데이트
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "aws.sqs.enabled", havingValue = "true")
public class SqsConsumerService {

    private final SqsClient sqsClient;
    private final GenerateJobRepository jobRepository;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Value("${aws.sqs.queue.result-url}")
    private String resultQueueUrl; // AI → Backend (RESULT 수신용)

    @Value("${aws.sqs.polling.max-messages:10}")
    private int maxMessages;

    @Value("${aws.sqs.polling.wait-time:10}")
    private int waitTimeSeconds;

    // 중복 처리 방지용 캐시 (최근 1000개)
    private final Set<String> processedMessageIds = new HashSet<>();
    private static final int MAX_CACHE_SIZE = 1000;

    /**
     * SQS 메시지 폴링 (5초마다)
     * - RESULT Queue만 폴링 (REQUEST는 별도 Queue로 분리됨)
     */
    @Scheduled(fixedDelay = 5000, initialDelay = 10000)
    public void pollMessages() {
        try {
            ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                    .queueUrl(resultQueueUrl)
                    .maxNumberOfMessages(maxMessages)
                    .waitTimeSeconds(waitTimeSeconds)
                    .build();

            List<Message> messages = sqsClient.receiveMessage(request).messages();

            if (!messages.isEmpty()) {
                log.info("📥 [SQS Consumer] RESULT 메시지 수신 | count={}", messages.size());
            }

            for (Message message : messages) {
                processMessage(message);
            }

        } catch (Exception e) {
            log.error("❌ [SQS Consumer] 폴링 실패 | error={}", e.getMessage(), e);
        }
    }

    /**
     * RESULT 메시지 처리
     */
    private void processMessage(Message message) {
        String messageId = message.messageId();
        String receiptHandle = message.receiptHandle();

        try {
            // 중복 처리 방지
            if (processedMessageIds.contains(messageId)) {
                log.warn("⚠️ [SQS Consumer] 중복 메시지 무시 | messageId={}", messageId);
                deleteMessage(receiptHandle);
                return;
            }

            // JSON 파싱
            SqsMessage sqsMessage = objectMapper.readValue(message.body(), SqsMessage.class);

            // RESULT 타입 확인 (안전장치)
            if (sqsMessage.getType() != SqsMessage.MessageType.RESULT) {
                log.warn("⚠️ [SQS Consumer] RESULT Queue에 잘못된 메시지 | messageId={} | type={}",
                        messageId, sqsMessage.getType());
                deleteMessage(receiptHandle);
                return;
            }

            log.info("📌 [SQS Consumer] RESULT 메시지 처리 시작 | jobId={} | success={}",
                    sqsMessage.getJobId(), sqsMessage.getSuccess());

            // Job 업데이트
            updateJob(sqsMessage);

            // 처리 완료 - 메시지 삭제
            deleteMessage(receiptHandle);

            // 캐시 추가
            addToCache(messageId);

            log.info("✅ [SQS Consumer] RESULT 메시지 처리 완료 | jobId={}", sqsMessage.getJobId());

        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            log.error("❌ [SQS Consumer] JSON 파싱 실패 | messageId={} | error={}",
                    messageId, e.getMessage());
            deleteMessage(receiptHandle);

        } catch (java.util.NoSuchElementException e) {
            log.error("❌ [SQS Consumer] Job not found | messageId={} | error={}",
                    messageId, e.getMessage());
            deleteMessage(receiptHandle);

        } catch (Exception e) {
            log.error("❌ [SQS Consumer] 메시지 처리 실패 | messageId={} | error={}",
                    messageId, e.getMessage(), e);
            // DB 업데이트 실패 등은 메시지 삭제 안 함 → Visibility Timeout 후 재처리
        }
    }

    /**
     * Job 업데이트
     */
    private void updateJob(SqsMessage result) {
        GenerateJobEntity job = jobRepository.findById(result.getJobId())
                .orElseThrow(() -> new java.util.NoSuchElementException("Job not found: " + result.getJobId()));

        // ✅ 유저가 이미 취소한 작업인 경우 업데이트 무시
        if (job.getStatus() == com.brickers.backend.job.entity.JobStatus.CANCELED) {
            log.info("   🚫 [CANCELED] 유저가 취소한 작업이므로 업데이트를 무시합니다. | jobId={}", job.getId());
            return;
        }

        if (result.getSuccess()) {
            // 성공 - URL 필드 업데이트
            job.setCorrectedImageUrl(result.getCorrectedUrl());
            job.setGlbUrl(result.getGlbUrl());
            job.setLdrUrl(result.getLdrUrl());
            job.setBomUrl(result.getBomUrl());
            job.setPdfUrl(result.getPdfUrl());
            job.setSuggestedTags(result.getTags());
            job.markDone();

            log.info("   ✅ Job 완료 처리 | jobId={} | ldrUrl={}", job.getId(), job.getLdrUrl());

        } else {
            // 실패 - 에러 메시지 저장
            job.markFailed(result.getErrorMessage());

            log.warn("   ⚠️ Job 실패 처리 | jobId={} | error={}", job.getId(), result.getErrorMessage());
        }

        jobRepository.save(job);
    }

    /**
     * 메시지 삭제
     */
    private void deleteMessage(String receiptHandle) {
        try {
            DeleteMessageRequest deleteRequest = DeleteMessageRequest.builder()
                    .queueUrl(resultQueueUrl)
                    .receiptHandle(receiptHandle)
                    .build();

            sqsClient.deleteMessage(deleteRequest);

        } catch (Exception e) {
            log.error("❌ [SQS Consumer] 메시지 삭제 실패 | error={}", e.getMessage());
        }
    }

    /**
     * 중복 방지 캐시 추가
     */
    private void addToCache(String messageId) {
        if (processedMessageIds.size() >= MAX_CACHE_SIZE) {
            processedMessageIds.clear();
            log.debug("🧹 [SQS Consumer] 캐시 클리어 | maxSize={}", MAX_CACHE_SIZE);
        }
        processedMessageIds.add(messageId);
    }
}
