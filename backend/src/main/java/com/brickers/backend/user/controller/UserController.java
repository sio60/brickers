package com.brickers.backend.user.controller;

import com.brickers.backend.user.repository.UserRepository;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final GenerateJobRepository jobRepository;
    private final GalleryPostRepository galleryPostRepository;

    @GetMapping("/check-nickname")
    public Map<String, Boolean> checkNickname(@RequestParam(name = "nickname") String nickname) {
        return Map.of("available", !userRepository.existsByNickname(nickname));
    }

    @GetMapping("/check-email")
    public Map<String, Boolean> checkEmail(@RequestParam(name = "email") String email) {
        return Map.of("exists", userRepository.existsByEmail(email));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserProfile(@PathVariable(name = "userId") String userId) {
        return userRepository.findById(userId)
                .map(user -> {
                    user.ensureDefaults();
                    return ResponseEntity.ok(Map.of(
                            "id", user.getId(),
                            "nickname", user.getNickname(),
                            "profileImage", user.getProfileImage(),
                            "bio", (user.getBio() != null ? user.getBio() : "")));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{userId}/stats")
    public Map<String, Object> getUserStats(@PathVariable(name = "userId") String userId) {
        long totalJobs = jobRepository.countByUserId(userId);
        long totalPosts = galleryPostRepository.countByAuthorIdAndDeletedFalse(userId);

        return Map.of(
                "totalPosts", totalPosts,
                "totalJobs", totalJobs);
    }
}
