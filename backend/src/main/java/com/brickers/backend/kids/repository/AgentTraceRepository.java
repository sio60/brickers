package com.brickers.backend.kids.repository;

import com.brickers.backend.kids.entity.AgentTrace;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgentTraceRepository extends MongoRepository<AgentTrace, String> {
    List<AgentTrace> findByJobIdOrderByCreatedAtAsc(String jobId);
}
