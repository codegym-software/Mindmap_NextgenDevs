package com.example.mindmap.features.collaboration;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface AccessRequestRepository extends MongoRepository<AccessRequest, String> {
    List<AccessRequest> findByMindmapId(String mindmapId);
    Optional<AccessRequest> findByMindmapIdAndUserId(String mindmapId, String userId);
    void deleteByMindmapIdAndUserId(String mindmapId, String userId);
}