package com.example.mindmap.features.chat;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ChatRepository extends MongoRepository<ChatMessage, String> {
    
    // Lấy tin nhắn của 1 mindmap, sắp xếp cũ nhất -> mới nhất
    List<ChatMessage> findByMindmapIdOrderByCreatedAtAsc(String mindmapId);
    
    // Nếu muốn phân trang (ví dụ lấy 50 tin mới nhất)
    List<ChatMessage> findByMindmapIdOrderByCreatedAtDesc(String mindmapId, Pageable pageable);
}