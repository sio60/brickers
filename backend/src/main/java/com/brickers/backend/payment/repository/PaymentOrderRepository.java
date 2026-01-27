package com.brickers.backend.payment.repository;

import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentOrderRepository extends MongoRepository<PaymentOrder, String> {

    // 주문 번호로 조회
    Optional<PaymentOrder> findByOrderNo(String orderNo);

    boolean existsByOrderNo(String orderNo);

    // PG 주문 ID로 조회
    Optional<PaymentOrder> findByPgOrderId(String pgOrderId);

    // 유저의 결제 내역
    Page<PaymentOrder> findByUserId(String userId, Pageable pageable);

    // 유저의 특정 상태 결제 내역
    Page<PaymentOrder> findByUserIdAndStatus(String userId, PaymentStatus status, Pageable pageable);

    // [New] 매출 통계용 (기간별 결제 완료 건)
    List<PaymentOrder> findByStatusAndPaidAtBetween(PaymentStatus status, java.time.LocalDateTime start,
            LocalDateTime end);

    // [New] 상태별 결제 내역 조회 (통계용)
    List<PaymentOrder> findByStatus(PaymentStatus status);
}
