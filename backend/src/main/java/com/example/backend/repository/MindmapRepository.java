package com.example.backend.repository;

import com.example.backend.model.Mindmap;
import com.example.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MindmapRepository extends JpaRepository<Mindmap, Long> {
    List<Mindmap> findAllByUserOrderByUpdatedAtDesc(User user);
}