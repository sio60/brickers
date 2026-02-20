package com.brickers.backend.kids.dto;

import lombok.Data;

@Data
public class PuzzleRankRequest {
    private String userId;
    private String nickname;
    private Double timeSpent;
}
