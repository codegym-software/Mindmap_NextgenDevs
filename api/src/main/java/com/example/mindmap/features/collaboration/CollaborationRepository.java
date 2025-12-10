// src/main/java/com/example/mindmap/features/collaboration/CollaborationRepository.java
package com.example.mindmap.features.collaboration;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface CollaborationRepository extends MongoRepository<Collaboration, String> {
    
    // Tìm danh sách theo User
    List<Collaboration> findByUserId(String userId);
    
    // Tìm danh sách theo Mindmap
    List<Collaboration> findByMindmapId(String mindmapId);
    
    // [FIX] Thêm method này để sửa lỗi build
    Optional<Collaboration> findByMindmapIdAndUserId(String mindmapId, String userId);

    // Check tồn tại (trả về true/false)
    boolean existsByMindmapIdAndUserId(String mindmapId, String userId);
    
    // Check quyền chuẩn: Phải đúng userId + mindmapId + Status (ACCEPTED)
    boolean existsByMindmapIdAndUserIdAndStatus(String mindmapId, String userId, Collaboration.InviteStatus status);
    
    // Xóa tất cả collab của 1 mindmap (khi xóa mindmap)
    void deleteByMindmapId(String mindmapId);
}