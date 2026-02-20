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

    public PuzzleRank saveRank(String userId, String nickname, Double timeSpent) {
        String normalizedUserId = normalizeUserId(userId);
        log.info("Puzzle rank save request: userId={}, nickname={}, timeSpent={}s", normalizedUserId, nickname, timeSpent);

        User user = "guest".equalsIgnoreCase(normalizedUserId)
                ? null
                : userRepository.findById(normalizedUserId).orElse(null);

        String resolvedNickname = resolveNickname(user, nickname, normalizedUserId);

        PuzzleRank rank = PuzzleRank.builder()
                .userId(normalizedUserId)
                .email(user != null ? user.getEmail() : "Guest")
                .nickname(resolvedNickname)
                .timeSpent(timeSpent)
                .createdAt(LocalDateTime.now())
                .build();

        return puzzleRankRepository.save(rank);
    }

    public List<PuzzleRank> getTopRanking() {
        return puzzleRankRepository.findTop10ByOrderByTimeSpentAsc();
    }

    private String normalizeUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            return "guest";
        }
        return userId.trim();
    }

    private String resolveNickname(User user, String fallbackNickname, String userId) {
        if (user != null && user.getNickname() != null && !user.getNickname().isBlank()) {
            return user.getNickname();
        }
        if (fallbackNickname != null && !fallbackNickname.isBlank()) {
            return fallbackNickname.trim();
        }
        if (userId == null || userId.isBlank() || "guest".equalsIgnoreCase(userId)) {
            return "Guest";
        }
        return userId;
    }
}
