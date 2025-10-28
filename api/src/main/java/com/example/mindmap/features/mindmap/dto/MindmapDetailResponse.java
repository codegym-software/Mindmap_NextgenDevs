// src/main/java/com/example/mindmap/features/mindmap/dto/MindmapDetailResponse.java
package com.example.mindmap.features.mindmap.dto;

import com.example.mindmap.features.collaboration.dto.CollaboratorResponse;
import com.example.mindmap.features.mindmap.Mindmap;
import com.example.mindmap.features.mindmap.content.MindmapContent;
import java.time.Instant;
import java.util.List;

// SỬA LỖI (Vấn đề #3): Thêm 4 trường còn thiếu
public record MindmapDetailResponse(
        String id,
        String name,
        String ownerId,
        MindmapContent content,
        Instant updatedAt,
        List<String> tags,
        Mindmap.AccessSettings accessSettings,
        List<CollaboratorResponse> collaborators,

        // 4 trường được thêm vào:
        String workspaceId,
        String lastEditedBy,
        Instant createdAt,
        Long version
) {}
