package com.brickers.backend.admin.stats;

import com.brickers.backend.admin.stats.dto.DailyStatsDto;
import com.brickers.backend.admin.stats.dto.JobStatsDto;
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
