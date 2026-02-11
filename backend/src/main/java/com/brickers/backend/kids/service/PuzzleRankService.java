package com.brickers.backend.kids.service;

import com.brickers.backend.kids.entity.PuzzleRank;
import com.brickers.backend.kids.repository.PuzzleRankRepository;
import com.brickers.backend.user.entity.User;
import com.brickers.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PuzzleRankService {

    private final PuzzleRankRepository puzzleRankRepository;
    private final UserRepository userRepository;

    /**
     * 퍼즐 랭킹 기록 저장
     */
    public PuzzleRank saveRank(String userId, Double timeSpent) {
        log.info("퍼즐 랭킹 저장 요청: userId={}, timeSpent={}s", userId, timeSpent);

        User user = userRepository.findById(userId)
                .orElse(null);

        PuzzleRank rank = PuzzleRank.builder()
                .userId(userId)
                .email(user != null ? user.getEmail() : "Guest")
                .nickname(user != null ? user.getNickname() : "Guest")
                .timeSpent(timeSpent)
                .createdAt(LocalDateTime.now())
                .build();

        return puzzleRankRepository.save(rank);
    }

    /**
     * 상위 랭킹 10위 조회
     */
    public List<PuzzleRank> getTopRanking() {
        return puzzleRankRepository.findTop10ByOrderByTimeSpentAsc();
    }
}
