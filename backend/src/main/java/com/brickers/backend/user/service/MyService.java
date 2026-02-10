package com.brickers.backend.user.service;

import com.brickers.backend.gallery.service.GalleryService;
import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.payment.dto.GooglePayVerifyRequest;
import com.brickers.backend.payment.service.PaymentService;
import com.brickers.backend.user.MySettingsResponse;
import com.brickers.backend.user.dto.*;
import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.MembershipPlan;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class MyService {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    // ✅ 추가
    private final GalleryService galleryService;
    private final GenerateJobRepository generateJobRepository;
    private final PaymentService paymentService;
    private final com.brickers.backend.gallery.repository.GalleryPostRepository galleryPostRepository;
    private final com.brickers.backend.gallery.repository.GalleryCommentRepository galleryCommentRepository;
    private final com.brickers.backend.gallery.service.GalleryRevalidateService galleryRevalidateService;

    /** 내 프로필 조회 */
    public MyProfileResponse getMyProfile(Authentication authentication) {
        User user = currentUserService.get(authentication);
        return toProfileResponse(user);
    }

    /** 내 프로필 수정(PATCH) */
    public MyProfileResponse updateMyProfile(Authentication authentication, MyProfileUpdateRequest req) {
        User user = currentUserService.get(authentication);

        // nickname
        if (req.getNickname() != null) {
            String nickname = req.getNickname().trim();
            if (nickname.isEmpty())
                throw new IllegalArgumentException("닉네임은 비어 있을 수 없습니다.");
            if (nickname.length() > 20)
                throw new IllegalArgumentException("닉네임은 20자 이하여야 합니다.");
            user.setNickname(nickname);
        }

        // bio
        if (req.getBio() != null) {
            String bio = req.getBio().trim();
            if (bio.length() > 200)
                throw new IllegalArgumentException("자기소개는 200자 이하여야 합니다.");
            user.setBio(bio);
        }

        // profile image (URL만 허용 / 빈 문자열은 변경 없음)
        if (req.getProfileImage() != null) {
            String img = req.getProfileImage().trim();

            if (img.isEmpty()) {
                // ✅ 변경 없음: 기존 이미지 유지
            } else if (img.startsWith("http")) {
                user.setProfileImage(img);
            } else {
                throw new IllegalArgumentException("profileImage는 http(s) URL만 허용됩니다.");
            }
        }

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // 닉네임 또는 프로필 이미지가 변경된 경우 갤러리/댓글 동기화
        boolean nicknameChanged = req.getNickname() != null;
        boolean profileImageChanged = req.getProfileImage() != null && !req.getProfileImage().trim().isEmpty();

        if (nicknameChanged || profileImageChanged) {
            String userId = user.getId();

            // 1. 갤러리 포스트 동기화
            List<com.brickers.backend.gallery.entity.GalleryPostEntity> posts = galleryPostRepository
                    .findByAuthorId(userId);
            if (!posts.isEmpty()) {
                posts.forEach(p -> {
                    if (nicknameChanged)
                        p.setAuthorNickname(user.getNickname());
                    if (profileImageChanged)
                        p.setAuthorProfileImage(user.getProfileImage());
                });
                galleryPostRepository.saveAll(posts);
            }

            // 2. 갤러리 댓글 동기화
            List<com.brickers.backend.gallery.entity.GalleryCommentEntity> comments = galleryCommentRepository
                    .findByAuthorId(userId);
            if (!comments.isEmpty()) {
                comments.forEach(c -> {
                    if (nicknameChanged)
                        c.setAuthorNickname(user.getNickname());
                    if (profileImageChanged)
                        c.setAuthorProfileImage(user.getProfileImage());
                });
                galleryCommentRepository.saveAll(comments);
            }

            // 3. Next.js 캐시 갱신
            galleryRevalidateService.onNicknameChanged();
        }

        return toProfileResponse(user);
    }

    /** 내 멤버십 조회 */
    public MyMembershipResponse getMyMembership(Authentication authentication) {
        User user = currentUserService.get(authentication);
        return MyMembershipResponse.builder()
                .membershipPlan(user.getMembershipPlan())
                .expiresAt(null)
                .build();
    }

    /** 멤버십 업그레이드 (PRO로 변경) */
    public MyMembershipResponse upgradeMembership(Authentication authentication,
            GooglePayVerifyRequest req) {
        User user = currentUserService.get(authentication);

        // 구글 페이 데이터가 있는 경우에만 검증 및 업그레이드 진행
        if (req != null && req.getPaymentData() != null) {
            paymentService.verifyGooglePay(authentication, req);
            // verifyGooglePay 내부에서 이미 user.setMembershipPlan(PRO) 및 저장을 하므로 다시 가져옴
            user = userRepository.findById(user.getId()).orElse(user);
        } else {
            // ✅ 보안 강화: 결제 데이터 없이는 업그레이드 불가
            log.warn("[Security] Upgrade attempt without payment data. userId={}", user.getId());
            throw new IllegalArgumentException("결제 검증 데이터가 필요합니다.");
        }

        return MyMembershipResponse.builder()
                .membershipPlan(user.getMembershipPlan())
                .expiresAt(null)
                .build();
    }

    /** 회원 탈퇴(soft delete): accountState=DELETED + deletedAt 기록 */
    public DeleteMyAccountResponse requestDeleteMyAccount(Authentication authentication) {
        User user = currentUserService.get(authentication);

        if (user.getAccountState() == AccountState.DELETED) {
            return DeleteMyAccountResponse.builder()
                    .success(false)
                    .message("이미 탈퇴 완료된 계정입니다.")
                    .build();
        }

        if (user.getAccountState() == AccountState.SUSPENDED) {
            return DeleteMyAccountResponse.builder()
                    .success(false)
                    .message("정지된 계정은 탈퇴할 수 없습니다. 관리자에게 문의하세요.")
                    .build();
        }

        user.setAccountState(AccountState.DELETED);
        if (user.getDeletedAt() == null)
            user.setDeletedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return DeleteMyAccountResponse.builder()
                .success(true)
                .message("회원 탈퇴가 정상적으로 처리되었습니다.")
                .build();
    }

    /** 내 설정 조회 */
    public MySettingsResponse getMySettings(Authentication authentication) {
        User user = currentUserService.get(authentication);
        user.ensureDefaults();
        return MySettingsResponse.from(user);
    }

    /** ✅ 내 생성 작업 목록 */
    public Page<MyJobResponse> listMyJobs(Authentication authentication, int page, int size) {
        User user = currentUserService.get(authentication);

        return generateJobRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size))
                .map(j -> {
                    j.ensureDefaults();
                    return MyJobResponse.from(j);
                });
    }

    /** ✅ 마이페이지 한 번에 로드: settings + 최근 내 글 + 최근 jobs */
    public MyOverviewResponse getMyOverview(Authentication authentication) {
        User user = currentUserService.get(authentication);
        user.ensureDefaults();

        MySettingsResponse settings = MySettingsResponse.from(user);

        // 최근 내 글 6개 (기존 /api/gallery/my 와 동일 소스)
        var myPostsPage = galleryService.listMine(authentication, 0, 6, "latest");
        var galleryOverview = MyOverviewResponse.GalleryOverview.builder()
                .totalCount(myPostsPage.getTotalElements())
                .recent(myPostsPage.getContent())
                .build();

        // 최근 jobs 6개
        var jobsPage = generateJobRepository.findByUserIdOrderByCreatedAtDesc(
                user.getId(),
                PageRequest.of(0, 6));

        var jobsRecent = jobsPage.getContent().stream().map(j -> {
            j.ensureDefaults();
            return MyJobResponse.from(j);
        }).toList();

        var jobsOverview = MyOverviewResponse.JobsOverview.builder()
                .totalCount(jobsPage.getTotalElements())
                .recent(jobsRecent)
                .build();

        return MyOverviewResponse.builder()
                .settings(settings)
                .gallery(galleryOverview)
                .jobs(jobsOverview)
                .build();
    }

    /** ✅ (코어 전) job 재시도 요청: 상태를 QUEUED로 되돌리고 fromStage 기록 */
    public MyJobResponse retryJob(Authentication authentication, String jobId, MyJobRetryRequest req) {
        User user = currentUserService.get(authentication);

        GenerateJobEntity job = generateJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("job을 찾을 수 없습니다. id=" + jobId));

        // 기존 문서 호환 + null 방지
        job.ensureDefaults();

        if (!job.getUserId().equals(user.getId())) {
            throw new IllegalStateException("내 job만 재시도할 수 있습니다.");
        }

        // (선택) 이미 RUNNING이면 재시도 막기
        if (job.getStatus() == JobStatus.RUNNING) {
            throw new IllegalStateException("진행 중인 작업은 재시도할 수 없습니다.");
        }

        // fromStage가 없으면 현재 stage부터
        JobStage fromStage = (req == null) ? null : req.getFromStage();
        if (fromStage == null) {
            fromStage = job.getStage();
        }

        // 재시도 기록
        job.setRequestedFromStage(fromStage);

        // 상태 초기화
        job.setStatus(JobStatus.QUEUED);
        job.setStage(fromStage);
        job.setErrorMessage(null);

        LocalDateTime now = LocalDateTime.now();
        job.setStageUpdatedAt(now);
        job.setUpdatedAt(now);

        generateJobRepository.save(job);

        return MyJobResponse.from(job);
    }

    /** ✅ job 취소 */
    public MyJobResponse cancelJob(Authentication authentication, String jobId) {
        User user = currentUserService.get(authentication);

        GenerateJobEntity job = generateJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("job을 찾을 수 없습니다. id=" + jobId));

        if (!job.getUserId().equals(user.getId())) {
            throw new IllegalStateException("내 job만 취소할 수 있습니다.");
        }

        // 대기 중(QUEUED)이거나 실행 중(RUNNING)일 때만 취소 가능
        if (job.getStatus() != JobStatus.QUEUED && job.getStatus() != JobStatus.RUNNING) {
            throw new IllegalStateException("취소할 수 없는 상태입니다 (현재 상태: " + job.getStatus() + ")");
        }

        job.markCanceled("User requested cancellation");
        generateJobRepository.save(job);

        log.info("[MyService] Job CANCELED | jobId={} | userId={}", jobId, user.getId());

        return MyJobResponse.from(job);
    }

    public List<MyActivityResponse> getActivity(Authentication authentication) {
        User user = currentUserService.get(authentication);

        List<MyActivityResponse> activities = new ArrayList<>();

        // 1. 내 최근 게시글 가져오기 (10개)
        var myPostsPage = galleryService.listMine(authentication, 0, 10, "latest");
        for (var post : myPostsPage.getContent()) {
            activities.add(MyActivityResponse.builder()
                    .type("POST")
                    .createdAt(post.getCreatedAt())
                    .data(post)
                    .build());
        }

        // 2. 내 최근 작업 가져오기 (10개)
        var jobsPage = generateJobRepository.findByUserIdOrderByCreatedAtDesc(
                user.getId(),
                PageRequest.of(0, 10));
        for (var job : jobsPage.getContent()) {
            job.ensureDefaults();
            activities.add(MyActivityResponse.builder()
                    .type("JOB")
                    .createdAt(job.getCreatedAt())
                    .data(MyJobResponse.from(job))
                    .build());
        }

        // 3. 통합 정렬 (최신순)
        activities.sort(Comparator.comparing(MyActivityResponse::getCreatedAt).reversed());

        return activities;
    }

    /** 프로필 이미지 삭제 (초기화) */
    public MyProfileResponse removeProfileImage(Authentication authentication) {
        User user = currentUserService.get(authentication);
        user.setProfileImage(""); // Empty string to remove
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return toProfileResponse(user);
    }

    /** 응답 DTO 매핑 */
    private MyProfileResponse toProfileResponse(User user) {
        user.ensureDefaults();
        return MyProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .bio(user.getBio())
                .profileImage(user.getProfileImage())
                .membershipPlan(user.getMembershipPlan())
                .accountState(user.getAccountState())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
