package com.brickers.backend.user.service;

import com.brickers.backend.gallery.service.GalleryService;
import com.brickers.backend.job.entity.GenerateJobEntity;
import com.brickers.backend.job.entity.JobStage;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
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

    private static final Set<String> ADMIN_EMAILS = Set.of(
            "rladbskepgpt@naver.com",
            "kurijuki11@gmail.com",
            "mayjoonll@naver.com",
            "mayjoonll@gmail.com",
            "khwhj@naver.com",
            "khwhj3577@gmail.com",
            "ghks0115@gmail.com",
            "passion.johnbyeon@gmail.com");

    /** 내 프로필 조회 */
    public MyProfileResponse getMyProfile(Authentication authentication) {
        User user = currentUserService.get(authentication);
        checkAndUpgradeAdmin(user);
        return toProfileResponse(user);
    }

    private void checkAndUpgradeAdmin(User user) {
        if (user.getEmail() != null) {
            String email = user.getEmail().trim().toLowerCase();
            boolean isAdminEmail = ADMIN_EMAILS.stream().anyMatch(e -> e.equalsIgnoreCase(email));

            if (isAdminEmail) {
                if (user.getRole() != com.brickers.backend.user.entity.UserRole.ADMIN) {
                    log.info("[AdminUpgrade] Upgrading user {} (email: {}) to ADMIN role", user.getId(),
                            user.getEmail());
                    user.setRole(com.brickers.backend.user.entity.UserRole.ADMIN);
                    userRepository.save(user);
                }
            }
        }
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
    public MyMembershipResponse upgradeMembership(Authentication authentication) {
        User user = currentUserService.get(authentication);
        user.setMembershipPlan(MembershipPlan.PRO);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

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
        checkAndUpgradeAdmin(user);
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
