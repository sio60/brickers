package com.brickers.backend.user.controller;

import com.brickers.backend.user.repository.UserRepository;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import lombok.RequiredArgsConstructor;
import com.brickers.backend.user.dto.PublicProfileResponse;
import com.brickers.backend.user.dto.UserActivitySummaryResponse;
import com.brickers.backend.user.entity.AccountState;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 공개 유저 API
 * /api/users/*
 */
@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final GenerateJobRepository jobRepository;
    private final GalleryPostRepository galleryPostRepository;
    private final UserService userService;

    /**
     * ✅ 닉네임 중복 체크
     * GET /api/users/check-nickname?nickname=xxx
     */
    @GetMapping("/check-nickname")
    public ResponseEntity<?> checkNickname(@RequestParam(name = "nickname") String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "닉네임을 입력해주세요."));
        }

        // 닉네임 형식 검증 (공백 없이, 2~20자)
        String trimmed = nickname.trim();
        if (trimmed.length() < 2 || trimmed.length() > 20) {
            return ResponseEntity.ok(Map.of(
                    "available", false,
                    "reason", "닉네임은 2~20자여야 합니다."));
        }

        if (trimmed.contains(" ")) {
            return ResponseEntity.ok(Map.of(
                    "available", false,
                    "reason", "닉네임에 공백을 포함할 수 없습니다."));
        }

        boolean exists = userRepository.existsByNickname(trimmed);

        return ResponseEntity.ok(Map.of(
                "available", !exists,
                "nickname", trimmed));
    }

    /**
     * ✅ 이메일 존재 확인
     * GET /api/users/check-email?email=xxx
     */
    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam(name = "email") String email) {
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "이메일을 입력해주세요."));
        }

        boolean exists = userRepository.existsByEmail(email.trim().toLowerCase());

        return ResponseEntity.ok(Map.of(
                "exists", exists,
                "email", email.trim().toLowerCase()));
    }

    /**
     * ✅ 프로필 공개 조회
     * GET /api/users/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserProfile(@PathVariable(name = "userId") String userId) {
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "사용자를 찾을 수 없습니다."));
        }

        // 탈퇴/정지 계정은 공개 프로필 제한
        if (user.getAccountState() == AccountState.SUSPENDED) {
            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "nickname", "정지된 사용자",
                    "profileImage", null,
                    "bio", null,
                    "suspended", true));
        }

        if (user.getAccountState() == AccountState.REQUESTED) {
            return ResponseEntity.status(404).body(Map.of("error", "탈퇴한 사용자입니다."));
        }

        return ResponseEntity.ok(PublicProfileResponse.from(user));
    }

    /**
     * ✅ 활동 요약 (상세)
     * GET /api/users/{userId}/summary
     */
    @GetMapping("/{userId}/summary")
    public ResponseEntity<?> getActivitySummary(@PathVariable(name = "userId") String userId) {
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "사용자를 찾을 수 없습니다."));
        }

        // 탈퇴/정지 계정은 활동 요약 제한
        if (user.getAccountState() != AccountState.ACTIVE) {
            return ResponseEntity.status(403).body(Map.of("error", "접근할 수 없는 사용자입니다."));
        }

        UserActivitySummaryResponse summary = userService.getActivitySummary(userId);
        return ResponseEntity.ok(summary);
    }

    /**
     * ✅ 활동 통계 (간단)
     * GET /api/users/{userId}/stats
     */
    @GetMapping("/{userId}/stats")
    public Map<String, Object> getUserStats(@PathVariable(name = "userId") String userId) {
        long totalJobs = jobRepository.countByUserId(userId);
        long totalPosts = galleryPostRepository.countByAuthorIdAndDeletedFalse(userId);

        return Map.of(
                "totalPosts", totalPosts,
                "totalJobs", totalJobs);
    }
}
