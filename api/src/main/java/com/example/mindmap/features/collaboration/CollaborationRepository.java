// src/main/java/com/example/mindmap/features/collaboration/CollaborationRepository.java
package com.example.mindmap.features.collaboration;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface CollaborationRepository extends MongoRepository<Collaboration, String> {
    List<Collaboration> findByUserId(String userId);
    List<Collaboration> findByMindmapId(String mindmapId);
    Optional<Collaboration> findByMindmapIdAndUserId(String mindmapId, String userId);
    boolean existsByMindmapIdAndUserId(String mindmapId, String userId);
    void deleteByMindmapId(String mindmapId);
}