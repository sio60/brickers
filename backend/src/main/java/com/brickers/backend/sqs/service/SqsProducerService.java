package com.brickers.backend.sqs.service;

import com.brickers.backend.sqs.dto.SqsMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageResponse;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class SqsProducerService {

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Value("${aws.sqs.queue.url}")
    private String queueUrl;

    /**
     * 작업 요청 메시지 전송 (Backend → AI Server)
     */
    public void sendJobRequest(String jobId, String userId, String sourceImageUrl, String age, int budget) {
        SqsMessage message = SqsMessage.builder()
                .type(SqsMessage.MessageType.REQUEST)
                .jobId(jobId)
                .userId(userId)
                .sourceImageUrl(sourceImageUrl)
                .age(age)
                .budget(budget)
                .timestamp(LocalDateTime.now())
                .build();

        sendMessage(message);
    }

    /**
     * 메시지 전송 (공통)
     */
    private void sendMessage(SqsMessage message) {
        try {
            String messageBody = objectMapper.writeValueAsString(message);

            SendMessageRequest request = SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(messageBody)
                    .build();

            SendMessageResponse response = sqsClient.sendMessage(request);

            log.info("✅ [SQS] 메시지 전송 완료 | type={} | jobId={} | messageId={}",
                    message.getType(), message.getJobId(), response.messageId());

        } catch (Exception e) {
            log.error("❌ [SQS] 메시지 전송 실패 | type={} | jobId={} | error={}",
                    message.getType(), message.getJobId(), e.getMessage(), e);
            throw new RuntimeException("SQS 메시지 전송 실패", e);
        }
    }
}
