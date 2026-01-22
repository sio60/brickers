package com.brickers.backend.board.dto;

import com.brickers.backend.board.entity.ReactionType;
import lombok.Data;

@Data
public class ReactionToggleRequest {
    private ReactionType type; // LIKE or DISLIKE
}
