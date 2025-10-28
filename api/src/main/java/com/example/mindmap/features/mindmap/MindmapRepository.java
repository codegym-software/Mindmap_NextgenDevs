// src/main/java/com/example/mindmap/features/mindmap/MindmapRepository.java
package com.example.mindmap.features.mindmap;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface MindmapRepository extends MongoRepository<Mindmap, String> {
    List<Mindmap> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);
    List<Mindmap> findByIdInOrderByUpdatedAtDesc(List<String> ids);
}