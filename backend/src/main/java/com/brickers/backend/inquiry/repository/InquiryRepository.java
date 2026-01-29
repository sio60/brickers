package com.brickers.backend.inquiry.repository;

import com.brickers.backend.inquiry.entity.Inquiry;
import com.brickers.backend.inquiry.entity.InquiryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InquiryRepository extends MongoRepository<Inquiry, String> {

    // ✅ 삭제되지 않은 내 문의 목록 (사용자용)
    Page<Inquiry> findByUserIdAndDeletedFalse(String userId, Pageable pageable);

    // 기존 메소드 (관리자용 - 삭제된 것도 포함)
    Page<Inquiry> findByUserId(String userId, Pageable pageable);

    // ✅ 삭제되지 않은 문의 중 상태별 필터 (관리자용)
    Page<Inquiry> findByStatusAndDeletedFalse(InquiryStatus status, Pageable pageable);

    // 상태별 필터 (관리자용 - 삭제된 것도 포함)
    Page<Inquiry> findByStatus(InquiryStatus status, Pageable pageable);

    // ✅ 삭제되지 않은 전체 문의 목록 (관리자용)
    Page<Inquiry> findByDeletedFalse(Pageable pageable);
}
