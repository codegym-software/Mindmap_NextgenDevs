package com.example.backend.repository;

import com.example.backend.model.Mindmap;
import com.example.backend.model.Node;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NodeRepository extends JpaRepository<Node, Long> {
    void deleteByMindmap(Mindmap mindmap);
    List<Node> findByMindmap(Mindmap mindmap);
    Optional<Node> findByIdAndMindmap_Id(Long id, Long mindmapId);
    List<Node> findByMindmap_Id(Long mindmapId);
}