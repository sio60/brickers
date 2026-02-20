package com.brickers.backend.kids.controller;

import com.brickers.backend.kids.dto.PuzzleRankRequest;
import com.brickers.backend.kids.entity.PuzzleRank;
import com.brickers.backend.kids.service.PuzzleRankService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kids/puzzle")
@RequiredArgsConstructor
public class PuzzleRankController {

    private final PuzzleRankService puzzleRankService;

    /**
     * 퍼즐 랭킹 기록 저장
     */
    @PostMapping("/rank")
    public PuzzleRank recordRank(@RequestBody PuzzleRankRequest request) {
        return puzzleRankService.saveRank(request.getUserId(), request.getNickname(), request.getTimeSpent());
    }

    /**
     * 전체 랭킹 조회 (TOP 10)
     */
    @GetMapping("/ranking")
    public List<PuzzleRank> getRanking() {
        return puzzleRankService.getTopRanking();
    }
}
