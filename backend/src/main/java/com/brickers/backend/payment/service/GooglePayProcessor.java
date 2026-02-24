package com.brickers.backend.payment.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 📱 GooglePayProcessor
 * 
 * Google Pay 결제 결과 데이터 파싱 및 검증 토큰 추출을 담당합니다.
 */
@Slf4j
@Component
public class GooglePayProcessor {

    /**
     * Google Pay 결제 데이터에서 토큰을 추출합니다.
     */
    @SuppressWarnings("unchecked")
    public String extractPaymentToken(Map<String, Object> paymentData) {
        if (paymentData == null)
            return null;

        try {
            Map<String, Object> paymentMethodData = (Map<String, Object>) paymentData.get("paymentMethodData");
            if (paymentMethodData == null)
                return null;

            Map<String, Object> tokenizationData = (Map<String, Object>) paymentMethodData.get("tokenizationData");
            if (tokenizationData == null)
                return null;

            return (String) tokenizationData.get("token");
        } catch (Exception e) {
            log.warn("Google Pay 토큰 추출 중 오류 발생", e);
            return null;
        }
    }
}
