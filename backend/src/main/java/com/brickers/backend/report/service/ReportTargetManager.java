package com.brickers.backend.report.service;

import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.inquiry.entity.Inquiry;
import com.brickers.backend.inquiry.repository.InquiryRepository;
import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
import com.brickers.backend.report.entity.ReportTargetType;
import com.brickers.backend.upload_s3.entity.UploadFile;
import com.brickers.backend.upload_s3.repository.UploadFileRepository;
import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 🎯 ReportTargetManager
 * 
 * 다양한 도메인의 신고 대상(유저, 게시글, 작업 등)에 대한
 * 존재 여부 확인 및 소프트 삭제 처리를 통합 관리합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReportTargetManager {

    private final UserRepository userRepository;
    private final GalleryPostRepository galleryPostRepository;
    private final GenerateJobRepository generateJobRepository;
    private final InquiryRepository inquiryRepository;
    private final UploadFileRepository uploadFileRepository;
    private final PaymentOrderRepository paymentOrderRepository;

    /**
     * 신고 대상이 실제로 존재하는지 검증하고 필요시 플래그(reported) 업데이트를 수행합니다.
     */
    public void validateTargetExistsAndFlag(ReportTargetType type, String targetId) {
        boolean exists = switch (type) {
            case USER -> userRepository.existsById(targetId);
            case GALLERY_POST -> galleryPostRepository.existsById(targetId);
            case JOB -> {
                GenerateJobEntity job = generateJobRepository.findById(targetId).orElse(null);
                if (job != null) {
                    if (!job.isReported()) {
                        job.setReported(true);
                        generateJobRepository.save(job);
                    }
                    yield true;
                }
                yield false;
            }
            case INQUIRY -> inquiryRepository.existsById(targetId);
            case UPLOAD_FILE -> uploadFileRepository.existsById(targetId);
            case PAYMENT_ORDER -> paymentOrderRepository.existsById(targetId);
            case GENERAL -> true;
        };

        if (!exists) {
            throw new IllegalArgumentException("신고 대상을 찾을 수 없습니다. type=" + type + ", id=" + targetId);
        }
    }

    /**
     * 대상이 이미 삭제(또는 정지)된 상태인지 확인합니다.
     */
    public boolean isAlreadyDeleted(ReportTargetType type, String targetId) {
        return switch (type) {
            case USER -> {
                User user = userRepository.findById(targetId).orElse(null);
                yield user != null && user.getAccountState() == AccountState.SUSPENDED;
            }
            case GALLERY_POST -> {
                GalleryPostEntity post = galleryPostRepository.findById(targetId).orElse(null);
                yield post != null && post.isDeleted();
            }
            case JOB -> {
                GenerateJobEntity job = generateJobRepository.findById(targetId).orElse(null);
                yield job != null && job.isDeleted();
            }
            case INQUIRY -> {
                Inquiry inquiry = inquiryRepository.findById(targetId).orElse(null);
                yield inquiry != null && inquiry.isDeleted();
            }
            case UPLOAD_FILE -> {
                UploadFile file = uploadFileRepository.findById(targetId).orElse(null);
                yield file != null && file.isDeleted();
            }
            case PAYMENT_ORDER -> {
                PaymentOrder order = paymentOrderRepository.findById(targetId).orElse(null);
                yield order != null && order.isDeleted();
            }
            case GENERAL -> false;
        };
    }

    /**
     * 타입별 실제 소프트 삭제 로직을 수행하고 결과 메시지를 반환합니다.
     */
    public String performSoftDelete(ReportTargetType type, String targetId) {
        return switch (type) {
            case USER -> {
                User user = userRepository.findById(targetId)
                        .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + targetId));
                user.suspend("신고에 의한 계정 정지");
                userRepository.save(user);
                yield "사용자 계정 정지 처리됨 (email=" + user.getEmail() + ")";
            }
            case GALLERY_POST -> {
                GalleryPostEntity post = galleryPostRepository.findById(targetId)
                        .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. id=" + targetId));
                post.setDeleted(true);
                post.setUpdatedAt(LocalDateTime.now());
                galleryPostRepository.save(post);
                yield "갤러리 게시글 삭제 처리됨 (title=" + post.getTitle() + ")";
            }
            case JOB -> {
                GenerateJobEntity job = generateJobRepository.findById(targetId)
                        .orElseThrow(() -> new IllegalArgumentException("작업을 찾을 수 없습니다. id=" + targetId));
                job.setDeleted(true);
                job.setUpdatedAt(LocalDateTime.now());
                generateJobRepository.save(job);
                yield "생성 작업 삭제 처리됨 (title=" + job.getTitle() + ")";
            }
            case INQUIRY -> {
                Inquiry inquiry = inquiryRepository.findById(targetId)
                        .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다. id=" + targetId));
                inquiry.setDeleted(true);
                inquiry.setUpdatedAt(LocalDateTime.now());
                inquiryRepository.save(inquiry);
                yield "문의 삭제 처리됨 (title=" + inquiry.getTitle() + ")";
            }
            case UPLOAD_FILE -> {
                UploadFile file = uploadFileRepository.findById(targetId)
                        .orElseThrow(() -> new IllegalArgumentException("파일을 찾을 수 없습니다. id=" + targetId));
                file.setDeleted(true);
                uploadFileRepository.save(file);
                yield "파일 삭제 처리됨 (name=" + file.getOriginalName() + ")";
            }
            case PAYMENT_ORDER -> {
                PaymentOrder order = paymentOrderRepository.findById(targetId)
                        .orElseThrow(() -> new IllegalArgumentException("결제 주문을 찾을 수 없습니다. id=" + targetId));
                order.setDeleted(true);
                order.setUpdatedAt(LocalDateTime.now());
                paymentOrderRepository.save(order);
                yield "결제 주문 삭제 처리됨 (orderNo=" + order.getOrderNo() + ")";
            }
            case GENERAL -> "대상 없음 (일반 신고)";
        };
    }
}
