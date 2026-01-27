package com.brickers.backend.admin.dashboard;

import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
import com.brickers.backend.user.repository.UserRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final GenerateJobRepository jobRepository;
    private final PaymentOrderRepository paymentOrderRepository;
    private final GalleryPostRepository galleryPostRepository;

    @GetMapping
    public AdminDashboardStats getDashboardStats() {
        return AdminDashboardStats.builder()
                .totalUsers(userRepository.count())
                .totalJobs(jobRepository.count())
                .totalOrders(paymentOrderRepository.count())
                .totalGalleryPosts(galleryPostRepository.count())
                .build();
    }

    @GetMapping("/metrics")
    public Map<String, Object> getMetrics() {
        // 간단한 헬스/메트릭 정보 (실제 모니터링 연동 전 mock/simple data)
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("status", "UP");
        metrics.put("systemTime", System.currentTimeMillis());
        return metrics;
    }

    @Data
    @Builder
    public static class AdminDashboardStats {
        private long totalUsers;
        private long totalJobs;
        private long totalOrders;
        private long totalGalleryPosts;
    }
}
