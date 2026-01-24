package com.brickers.backend.inquiry.repository;

import com.brickers.backend.inquiry.entity.Inquiry;
import com.brickers.backend.inquiry.entity.InquiryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InquiryRepository extends MongoRepository<Inquiry, String> {

    // 내 문의 목록
    Page<Inquiry> findByUserId(String userId, Pageable pageable);

    // 상태별 필터 (관리자용)
    Page<Inquiry> findByStatus(InquiryStatus status, Pageable pageable);
}
