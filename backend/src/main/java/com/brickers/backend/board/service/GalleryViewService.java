package com.brickers.backend.board.service;

import com.brickers.backend.board.entity.GalleryPostEntity;
import com.brickers.backend.board.repository.GalleryPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GalleryViewService {

    private final GalleryPostRepository postRepository;
    private final MongoTemplate mongoTemplate;

    /** 세션 저장소(Map)에 기록된 마지막 조회 시간을 보고, 24시간 지나면 viewCount +1 */
    public void increaseViewIfNeeded(String postId, Map<String, LocalDateTime> sessionViewMap) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last = sessionViewMap.get(postId);

        if (last != null && last.isAfter(now.minusHours(24)))
            return;

        sessionViewMap.put(postId, now);

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(postId).and("deleted").is(false)),
                new Update().inc("viewCount", 1).set("updatedAt", now),
                GalleryPostEntity.class);
    }
}
