package com.brickers.backend.user.service;

import com.brickers.backend.gallery.service.GalleryService;
import com.brickers.backend.gallery.entity.GalleryCommentEntity;
import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.repository.GalleryCommentRepository;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.gallery.service.GalleryRevalidateService;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.payment.dto.GooglePayVerifyRequest;
import com.brickers.backend.payment.service.PaymentService;
import com.brickers.backend.user.dto.MySettingsResponse;
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
    private final GalleryService galleryService;
    private final GenerateJobRepository generateJobRepository;
    private final PaymentService paymentService;
    private final GalleryPostRepository galleryPostRepository;
    private final GalleryCommentRepository galleryCommentRepository;
    private final GalleryRevalidateService galleryRevalidateService;

    // ✅ 리팩토링 컴포넌트
    private final UserMapper userMapper;
    private final MyJobService myJobService;

    /** 내 프로필 조회 */
    public MyProfileResponse getMyProfile(Authentication authentication) {
        return userMapper.toProfileResponse(currentUserService.get(authentication));
    }

    /** 내 프로필 수정(PATCH) */
    public MyProfileResponse updateMyProfile(Authentication authentication, MyProfileUpdateRequest req) {
        User user = currentUserService.get(authentication);

        if (req.getNickname() != null) {
            String nickname = req.getNickname().trim();
            if (nickname.isEmpty())
                throw new IllegalArgumentException("닉네임은 비어 있을 수 없습니다.");
            if (nickname.length() > 20)
                throw new IllegalArgumentException("닉네임은 20자 이하여야 합니다.");
            if (userRepository.existsByNicknameAndIdNot(nickname, user.getId()))
                throw new IllegalArgumentException("Nickname is already taken.");
            user.setNickname(nickname);
        }

        if (req.getBio() != null) {
            String bio = req.getBio().trim();
            if (bio.length() > 200)
                throw new IllegalArgumentException("자기소개는 200자 이하여야 합니다.");
            user.setBio(bio);
        }

        if (req.getProfileImage() != null) {
            String img = req.getProfileImage().trim();
            if (!img.isEmpty()) {
                if (img.startsWith("http"))
                    user.setProfileImage(img);
                else
                    throw new IllegalArgumentException("profileImage는 http(s) URL만 허용됩니다.");
            }
        }

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // 닉네임 또는 프로필 이미지가 변경된 경우 동기화
        if (req.getNickname() != null || (req.getProfileImage() != null && !req.getProfileImage().trim().isEmpty())) {
            syncGalleryUserInfo(user);
        }

        return userMapper.toProfileResponse(user);
    }

    private void syncGalleryUserInfo(User user) {
        List<GalleryPostEntity> posts = galleryPostRepository.findByAuthorId(user.getId());
        posts.forEach(p -> {
            p.setAuthorNickname(user.getNickname());
            p.setAuthorProfileImage(user.getProfileImage());
        });
        galleryPostRepository.saveAll(posts);

        List<GalleryCommentEntity> comments = galleryCommentRepository.findByAuthorId(user.getId());
        comments.forEach(c -> {
            c.setAuthorNickname(user.getNickname());
            c.setAuthorProfileImage(user.getProfileImage());
        });
        galleryCommentRepository.saveAll(comments);

        galleryRevalidateService.onNicknameChanged();
    }

    /** 내 멤버십 조회 */
    public MyMembershipResponse getMyMembership(Authentication authentication) {
        User user = currentUserService.get(authentication);
        return MyMembershipResponse.builder().membershipPlan(user.getMembershipPlan()).expiresAt(null).build();
    }

    /** 멤버십 해지 (FREE로 변경) */
    public CancelMembershipResponse cancelMembership(Authentication authentication, CancelMembershipRequest req) {
        User user = currentUserService.get(authentication);
        if (user.getMembershipPlan() == MembershipPlan.FREE) {
            return CancelMembershipResponse.builder().success(false).message("이미 FREE 멤버십 상태입니다.").build();
        }

        user.setMembershipPlan(MembershipPlan.FREE);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("[MyService] Membership CANCELED | userId={} | reason={}", user.getId(),
                (req != null) ? req.getReason() : "No reason");
        return CancelMembershipResponse.builder().success(true).message("멤버십 해지가 완료되었습니다.").build();
    }

    /** 멤버십 업그레이드 (PRO로 변경) */
    public MyMembershipResponse upgradeMembership(Authentication authentication, GooglePayVerifyRequest req) {
        if (req == null || req.getPaymentData() == null)
            throw new IllegalArgumentException("결제 검증 데이터가 필요합니다.");
        paymentService.verifyGooglePay(authentication, req);
        User user = currentUserService.get(authentication);
        return MyMembershipResponse.builder().membershipPlan(user.getMembershipPlan()).expiresAt(null).build();
    }

    /** 회원 탈퇴 */
    public DeleteMyAccountResponse requestDeleteMyAccount(Authentication authentication) {
        User user = currentUserService.get(authentication);
        if (user.getAccountState() == AccountState.DELETED)
            return DeleteMyAccountResponse.builder().success(false).message("이미 탈퇴 완료된 계정입니다.").build();
        if (user.getAccountState() == AccountState.SUSPENDED)
            return DeleteMyAccountResponse.builder().success(false).message("정지된 계정은 탈퇴할 수 없습니다.").build();

        user.setAccountState(AccountState.DELETED);
        if (user.getDeletedAt() == null)
            user.setDeletedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return DeleteMyAccountResponse.builder().success(true).message("회원 탈퇴가 정상적으로 처리되었습니다.").build();
    }

    /** 내 설정 조회 */
    public MySettingsResponse getMySettings(Authentication authentication) {
        User user = currentUserService.get(authentication);
        user.ensureDefaults();
        return MySettingsResponse.from(user);
    }

    /** 내 생성 작업 목록 */
    public Page<MyJobResponse> listMyJobs(Authentication authentication, int page, int size) {
        return myJobService.listMyJobs(currentUserService.get(authentication).getId(), page, size);
    }

    /** 마이페이지 오버뷰 */
    public MyOverviewResponse getMyOverview(Authentication authentication) {
        User user = currentUserService.get(authentication);
        user.ensureDefaults();

        var myPostsPage = galleryService.listMine(authentication, 0, 6, "latest");
        var jobsPage = generateJobRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 6));

        return MyOverviewResponse.builder()
                .settings(MySettingsResponse.from(user))
                .gallery(MyOverviewResponse.GalleryOverview.builder().totalCount(myPostsPage.getTotalElements())
                        .recent(myPostsPage.getContent()).build())
                .jobs(MyOverviewResponse.JobsOverview.builder().totalCount(jobsPage.getTotalElements())
                        .recent(jobsPage.getContent().stream().map(userMapper::toJobResponse).toList()).build())
                .build();
    }

    /** 작업 재시도 */
    public MyJobResponse retryJob(Authentication auth, String jobId, MyJobRetryRequest req) {
        return myJobService.retryJob(currentUserService.get(auth).getId(), jobId, req);
    }

    /** 작업 취소 */
    public MyJobResponse cancelJob(Authentication auth, String jobId) {
        return myJobService.cancelJob(currentUserService.get(auth).getId(), jobId);
    }

    /** 활동 내역 조회 */
    public List<MyActivityResponse> getActivity(Authentication authentication) {
        User user = currentUserService.get(authentication);
        List<MyActivityResponse> activities = new ArrayList<>();

        galleryService.listMine(authentication, 0, 10, "latest").getContent()
                .forEach(p -> activities.add(userMapper.toActivityResponse("POST", p, p.getCreatedAt())));

        generateJobRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 10)).getContent()
                .forEach(j -> activities
                        .add(userMapper.toActivityResponse("JOB", userMapper.toJobResponse(j), j.getCreatedAt())));

        activities.sort(Comparator.comparing(MyActivityResponse::getCreatedAt).reversed());
        return activities;
    }

    /** 프로필 이미지 삭제 */
    public MyProfileResponse removeProfileImage(Authentication authentication) {
        User user = currentUserService.get(authentication);
        user.setProfileImage("");
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return userMapper.toProfileResponse(user);
    }
}
