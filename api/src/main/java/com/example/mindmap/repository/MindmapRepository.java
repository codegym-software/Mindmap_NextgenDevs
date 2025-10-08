package com.example.mindmap.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.example.mindmap.model.Mindmap;

public interface MindmapRepository extends MongoRepository<Mindmap, String> {
    List<Mindmap> findByOwnerSubOrderByUpdatedAtDesc(String ownerSub);
}
