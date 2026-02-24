package com.brickers.backend.report.service;

import com.brickers.backend.report.dto.ReportResponse;
import com.brickers.backend.report.entity.Report;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 🗺️ ReportMapper
 * 
 * Report 엔티티를 ReportResponse DTO로 변환하는 로직을 전담합니다.
 * 신고자의 이메일 정보 조회를 포함합니다.
 */
@Component
@RequiredArgsConstructor
public class ReportMapper {

    private final UserRepository userRepository;

    /**
     * Report 엔티티를 응답 DTO로 변환합니다.
     */
    public ReportResponse toResponse(Report report) {
        if (report == null)
            return null;

        ReportResponse resp = ReportResponse.from(report);

        // 신고자 이메일 추가 정보 로드
        userRepository.findById(report.getReporterId())
                .ifPresent(user -> resp.setReporterEmail(user.getEmail()));

        return resp;
    }
}
