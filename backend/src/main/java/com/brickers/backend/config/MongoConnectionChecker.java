package com.brickers.backend.config;
//  MongoDB 로컬 연결 되어있는지 확인하는 클래스스스

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MongoConnectionChecker implements ApplicationRunner {

    private final MongoClient mongoClient;
    private final MongoTemplate mongoTemplate;

    @Override
    public void run(ApplicationArguments args) {

        log.info("========================================");
        log.info("✅ MongoDB Connection Check");

        // 1️⃣ MongoClient 기준 (낮은 레벨)
        MongoDatabase database = mongoClient.getDatabase("brickers");
        log.info("🔗 MongoClient DB Name: {}", database.getName());

        log.info("📦 Existing Collections (MongoClient):");
        database.listCollectionNames()
                .forEach(name -> log.info("  - {}", name));

        // 2️⃣ MongoTemplate 기준 (Spring Data 실제 사용 DB)
        log.info("🧠 MongoTemplate DB Name: {}",
                mongoTemplate.getDb().getName());

        log.info("========================================");
    }
}
