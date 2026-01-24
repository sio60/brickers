package com.brickers.backend.admin.service;

import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.user.repository.UserRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final GenerateJobRepository jobRepository;
    private final GalleryPostRepository galleryRepository;

    @Data
    @Builder
    public static class AdminStats {
        private long totalUsers;
        private long totalJobsCount;
        private long totalGalleryPosts;
    }

    public AdminStats getStats() {
        return AdminStats.builder()
                .totalUsers(userRepository.count())
                .totalJobsCount(jobRepository.count())
                .totalGalleryPosts(galleryRepository.count())
                .build();
    }
}
