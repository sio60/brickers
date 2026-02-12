package com.brickers.backend.report.service;

import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.inquiry.entity.Inquiry;
import com.brickers.backend.inquiry.repository.InquiryRepository;
import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
import com.brickers.backend.report.dto.ReportCreateRequest;
import com.brickers.backend.report.dto.ReportResolveRequest;
import com.brickers.backend.report.dto.ReportResponse;
import com.brickers.backend.report.entity.Report;
import com.brickers.backend.report.entity.ReportStatus;
import com.brickers.backend.report.entity.ReportTargetType;
import com.brickers.backend.report.repository.ReportRepository;
import com.brickers.backend.upload_s3.entity.UploadFile;
import com.brickers.backend.upload_s3.repository.UploadFileRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import com.brickers.backend.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.brickers.backend.user.entity.AccountState;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    // ✅ 소프트 삭제를 위한 Repository 주입
    private final GalleryPostRepository galleryPostRepository;
    private final GenerateJobRepository generateJobRepository;
    private final InquiryRepository inquiryRepository;
    private final UploadFileRepository uploadFileRepository;
    private final PaymentOrderRepository paymentOrderRepository;

    // --- User Side ---

    public ReportResponse createReport(Authentication auth, ReportCreateRequest req) {
        User user = currentUserService.get(auth);
        String userId = user.getId();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneMinuteAgo = now.minusMinutes(1);

        // ✅ 1분 내 + CANCELED 제외 중복 신고 차단
        boolean existsRecently = reportRepository
                .existsByReporterIdAndTargetTypeAndTargetIdAndStatusNotAndCreatedAtAfter(
                        userId,
                        req.getTargetType(),
                        req.getTargetId(),
                        ReportStatus.CANCELED,
                        oneMinuteAgo);

        if (existsRecently) {
            throw new IllegalArgumentException("신고가 너무 빠르게 반복되었습니다. 1분 후 다시 시도해주세요.");
        }

        // ✅ 신고 대상 존재 여부 검증 및 Job 신고 시 reported 플래그 처리
        validateTargetExistsAndFlag(req.getTargetType(), req.getTargetId());

        Report report = Report.builder()
                .reporterId(userId)
                .targetType(req.getTargetType())
                .targetId(req.getTargetId())
                .reason(req.getReason())
                .details(req.getDetails())
                .status(ReportStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        ReportResponse resp = ReportResponse.from(reportRepository.save(report));
        resp.setReporterEmail(user.getEmail());
        return resp;
    }

    /**
     * ✅ 신고 대상이 실제로 존재하는지 검증하고 필요시 플래그 업데이트
     */
    private void validateTargetExistsAndFlag(ReportTargetType type, String targetId) {
        boolean exists = switch (type) {
            case USER -> userRepository.existsById(targetId);
            case GALLERY_POST -> galleryPostRepository.existsById(targetId);
            case JOB -> {
                GenerateJobEntity job = generateJobRepository.findById(targetId).orElse(null);
                if (job != null) {
                    // ✅ 신고된 작업임을 표시 (관리자 필터링용)
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

    public Page<ReportResponse> getMyReports(Authentication auth, int page, int size) {
        User user = currentUserService.get(auth);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reportRepository.findByReporterId(user.getId(), pageable).map(it -> {
            ReportResponse resp = ReportResponse.from(it);
            resp.setReporterEmail(user.getEmail());
            return resp;
        });
    }

    public ReportResponse getMyReport(Authentication auth, String reportId) {
        User user = currentUserService.get(auth);

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NoSuchElementException("신고를 찾을 수 없습니다."));

        if (!report.getReporterId().equals(user.getId())) {
            throw new IllegalArgumentException("본인의 신고만 조회 가능합니다.");
        }
        ReportResponse resp = ReportResponse.from(report);
        resp.setReporterEmail(user.getEmail());
        return resp;
    }

    public void cancelMyReport(Authentication auth, String reportId) {
        User user = currentUserService.get(auth);

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        if (!report.getReporterId().equals(user.getId())) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new IllegalArgumentException("이미 처리된 신고는 취소할 수 없습니다.");
        }

        report.cancel();
        reportRepository.save(report);
    }

    // --- Admin Side ---

    public Page<ReportResponse> getAllReports(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reportRepository.findAll(pageable).map(it -> {
            ReportResponse resp = ReportResponse.from(it);
            userRepository.findById(it.getReporterId()).ifPresent(user -> resp.setReporterEmail(user.getEmail()));
            return resp;
        });
    }

    public ReportResponse getReportDetail(String reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));
        ReportResponse resp = ReportResponse.from(report);
        userRepository.findById(report.getReporterId()).ifPresent(user -> resp.setReporterEmail(user.getEmail()));
        return resp;
    }

    public ReportResponse resolveReport(Authentication authentication, String reportId, ReportResolveRequest req) {
        User admin = currentUserService.get(authentication);

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "신고를 찾을 수 없습니다."));

        // ✅ PENDING만 처리 가능 (RESOLVED/REJECTED/CANCELED는 재처리 불가)
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(CONFLICT,
                    "이미 처리된 신고입니다. (status=" + report.getStatus() + ")");
        }

        var action = req.getAction();
        var note = req.getNote();

        if (action == ReportResolveRequest.ResolveAction.APPROVE) {
            report.resolve(admin.getId(), note);
        } else if (action == ReportResolveRequest.ResolveAction.REJECT) {
            report.reject(admin.getId(), note);
        } else {
            throw new ResponseStatusException(NOT_FOUND, "Invalid action: " + action);
        }

        return ReportResponse.from(reportRepository.save(report));
    }

    /**
     * ✅ 신고 대상에 대해 실제 소프트 삭제 조치 수행
     */
    @Transactional
    public void deleteReportTarget(Authentication auth, String reportId) {
        User admin = currentUserService.get(auth);
        String adminId = admin.getId();

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));

        // ✅ PENDING 상태만 조치 가능
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(CONFLICT,
                    "이미 처리된 신고입니다. (status=" + report.getStatus() + ")");
        }

        ReportTargetType type = report.getTargetType();
        String targetId = report.getTargetId();

        // ✅ 대상이 이미 삭제되었는지 확인
        if (isAlreadyDeleted(type, targetId)) {
            throw new ResponseStatusException(CONFLICT,
                    "이미 삭제된 대상입니다. type=" + type + ", id=" + targetId);
        }

        log.info("[Report] Admin {} performing soft delete on target type={}, id={}", adminId, type, targetId);

        // ✅ 타입별 실제 소프트 삭제 수행
        String actionDetail = performSoftDelete(type, targetId);

        report.resolve(adminId, "대상 삭제 조치: " + actionDetail);
        reportRepository.save(report);

        log.info("[Report] Soft delete completed. type={}, id={}, action={}", type, targetId, actionDetail);
    }

    /**
     * ✅ 대상이 이미 삭제되었는지 확인
     */
    private boolean isAlreadyDeleted(ReportTargetType type, String targetId) {
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
     * ✅ 타입별 소프트 삭제 로직 수행
     */
    private String performSoftDelete(ReportTargetType type, String targetId) {
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
