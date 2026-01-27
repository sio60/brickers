package com.brickers.backend.admin.stats;

import com.brickers.backend.admin.stats.dto.DailyStatsDto;
import com.brickers.backend.admin.stats.dto.DownloadStatsDto;
import com.brickers.backend.admin.stats.dto.JobStatsDto;
import com.brickers.backend.admin.stats.dto.StatsSummaryDto;
import com.brickers.backend.admin.stats.dto.TokenStatsDto;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import com.brickers.backend.job.entity.JobStatus;
import com.brickers.backend.job.repository.GenerateJobRepository;
import com.brickers.backend.payment.entity.PaymentOrder;
import com.brickers.backend.payment.entity.PaymentStatus;
import com.brickers.backend.payment.repository.PaymentOrderRepository;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminStatsService {

    private final UserRepository userRepository;
    private final GenerateJobRepository jobRepository;
    private final PaymentOrderRepository paymentOrderRepository;
    private final GalleryPostRepository galleryPostRepository;

    /**
     * 전체 통계 요약
     */
    public StatsSummaryDto getSummary() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime weekStart = LocalDate.now().minusDays(7).atStartOfDay();

        long totalUsers = userRepository.count();
        long newUsersToday = userRepository.countByCreatedAtBetween(todayStart, now);
        long newUsersThisWeek = userRepository.countByCreatedAtBetween(weekStart, now);
        long totalPosts = galleryPostRepository.count();

        // 결제 통계
        List<PaymentOrder> completedPayments = paymentOrderRepository.findByStatus(PaymentStatus.COMPLETED);
        long totalPayments = completedPayments.size();
        long totalRevenue = completedPayments.stream()
                .map(PaymentOrder::getAmount)
                .mapToLong(amount -> amount == null ? 0L : amount.longValue())
                .sum();

        // Job 통계
        long activeJobs = jobRepository.countByStatus(JobStatus.QUEUED)
                + jobRepository.countByStatus(JobStatus.RUNNING);
        long completedJobs = jobRepository.countByStatus(JobStatus.DONE);
        long failedJobs = jobRepository.countByStatus(JobStatus.FAILED);

        return StatsSummaryDto.builder()
                .totalUsers(totalUsers)
                .newUsersToday(newUsersToday)
                .newUsersThisWeek(newUsersThisWeek)
                .totalPosts(totalPosts)
                .totalPayments(totalPayments)
                .totalRevenue(totalRevenue)
                .activeJobs(activeJobs)
                .completedJobs(completedJobs)
                .failedJobs(failedJobs)
                .build();
    }

    /**
     * 토큰/생성 통계 (일별)
     */
    public List<TokenStatsDto> getTokenStats(int days) {
        List<TokenStatsDto> stats = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(LocalTime.MAX);

            // 해당 일자의 Job 통계 (createdAt 기준)
            long successCount = jobRepository.countByStatusAndUpdatedAtAfter(JobStatus.DONE, start);
            long failedCount = jobRepository.countByStatusAndUpdatedAtAfter(JobStatus.FAILED, start);

            // 간단한 추정 (정확한 일별 통계를 위해서는 별도 집계 필요)
            long total = successCount + failedCount;
            double successRate = total > 0 ? (double) successCount / total * 100 : 0;

            stats.add(TokenStatsDto.builder()
                    .date(date)
                    .totalGenerations(total)
                    .successfulGenerations(successCount)
                    .failedGenerations(failedCount)
                    .successRate(Math.round(successRate * 100.0) / 100.0)
                    .build());
        }
        return stats;
    }

    /**
     * 다운로드 분석
     * - 현재 다운로드 추적 시스템이 없으므로 Job 기반 추정 통계 제공
     * - 추후 다운로드 로그 테이블 추가 시 실제 데이터로 대체
     */
    public DownloadStatsDto getDownloadStats() {
        long completedJobs = jobRepository.countByStatus(JobStatus.DONE);

        // 유료/무료 다운로드 (현재는 추정치: 완료된 Job = 다운로드 가능한 도안)
        // 실제 다운로드 로그가 없으므로 플레이스홀더
        long totalDownloads = completedJobs;
        long paidDownloads = 0; // PRO 유저 다운로드 (추후 구현)
        long freeDownloads = totalDownloads; // 현재는 모두 무료로 간주

        double paidRatio = totalDownloads > 0 ? (double) paidDownloads / totalDownloads * 100 : 0;
        double freeRatio = totalDownloads > 0 ? (double) freeDownloads / totalDownloads * 100 : 100;

        return DownloadStatsDto.builder()
                .totalDownloads(totalDownloads)
                .freeDownloads(freeDownloads)
                .paidDownloads(paidDownloads)
                .freeRatio(Math.round(freeRatio * 100.0) / 100.0)
                .paidRatio(Math.round(paidRatio * 100.0) / 100.0)
                .build();
    }

    /**
     * 최근 N일간의 가입자 수 통계
     */
    public List<DailyStatsDto> getUserGrowthStats(int days) {
        List<DailyStatsDto> stats = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(LocalTime.MAX);

            long count = userRepository.countByCreatedAtBetween(start, end);
            stats.add(new DailyStatsDto(date, count, 0L));
        }
        return stats;
    }

    /**
     * AI Job 성공률 및 상태 통계
     */
    public JobStatsDto getJobStats() {
        long total = jobRepository.count();
        long success = jobRepository.countByStatus(JobStatus.DONE);
        long failed = jobRepository.countByStatus(JobStatus.FAILED);

        double successRate = total > 0 ? (double) success / total * 100 : 0;
        double failedRate = total > 0 ? (double) failed / total * 100 : 0;

        return JobStatsDto.builder()
                .totalJobs(total)
                .successCount(success)
                .failedCount(failed)
                .successRate(Math.round(successRate * 100.0) / 100.0)
                .failedRate(Math.round(failedRate * 100.0) / 100.0)
                .build();
    }

    /**
     * 최근 N일간의 매출 통계
     */
    public List<DailyStatsDto> getRevenueStats(int days) {
        List<DailyStatsDto> stats = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(LocalTime.MAX);

            List<PaymentOrder> orders = paymentOrderRepository.findByStatusAndPaidAtBetween(
                    PaymentStatus.COMPLETED, start, end);

            long totalAmount = orders.stream()
                    .map(PaymentOrder::getAmount)
                    .mapToLong(amount -> amount == null ? 0L : amount.longValue())
                    .sum();

            stats.add(new DailyStatsDto(date, orders.size(), totalAmount));
        }
        return stats;
    }
}
