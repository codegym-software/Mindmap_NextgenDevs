// src/main/java/com/example/mindmap/features/mindmap/dto/MindmapUpdateRequest.java
package com.example.mindmap.features.mindmap.dto;

import com.example.mindmap.features.mindmap.content.MindmapContent;

import jakarta.validation.constraints.Size;

public record MindmapUpdateRequest(
        @Size(max = 200)
        String name,
        MindmapContent content
) {}