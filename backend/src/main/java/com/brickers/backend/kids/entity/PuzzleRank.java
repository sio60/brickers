package com.brickers.backend.kids.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * 퍼즐 랭킹 엔티티 (MongoDB)
 */
@Document(collection = "puzzle_ranks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PuzzleRank {

    @Id
    private String id;

    private String userId;
    private String email;
    private String nickname;

    // 퍼즐을 푸는 데 걸린 시간 (초)
    private Double timeSpent;

    private LocalDateTime createdAt;
}
