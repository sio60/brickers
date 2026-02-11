package com.brickers.backend.kids.repository;

import com.brickers.backend.kids.entity.PuzzleRank;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PuzzleRankRepository extends MongoRepository<PuzzleRank, String> {
    // 소요 시간(timeSpent) 오름차순으로 정렬하여 상위 리스트 조회
    List<PuzzleRank> findTop10ByOrderByTimeSpentAsc();
}
