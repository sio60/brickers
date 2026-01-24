package com.brickers.backend.payment.repository;

import com.brickers.backend.payment.entity.PaymentPlan;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentPlanRepository extends MongoRepository<PaymentPlan, String> {

    // 활성화된 플랜 목록 (정렬 순서대로)
    List<PaymentPlan> findByActiveTrueOrderBySortOrderAsc();

    // 코드로 조회
    Optional<PaymentPlan> findByCode(String code);
}
