package com.brickers.backend.kids.dto;

import lombok.Data;

@Data
public class PuzzleRankRequest {
    private String userId;
    private Double timeSpent;
}
