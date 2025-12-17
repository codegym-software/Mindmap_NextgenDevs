// src/main/java/com/example/mindmap/features/mindmap/dto/MindmapSummaryResponse.java
package com.example.mindmap.features.mindmap.dto;

import java.time.Instant;
import java.util.List;

import com.example.mindmap.features.mindmap.Mindmap;

public record MindmapSummaryResponse(
        String id,
        String name,
        String ownerId,
        Instant createdAt,
        Instant updatedAt,
        List<String> tags,
        Mindmap.AccessSettings accessSettings
) {}