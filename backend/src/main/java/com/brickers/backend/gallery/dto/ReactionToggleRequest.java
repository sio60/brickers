package com.brickers.backend.gallery.dto;

import com.brickers.backend.gallery.entity.ReactionType;

import lombok.Data;

@Data
public class ReactionToggleRequest {
    private ReactionType type; // LIKE or DISLIKE
}
