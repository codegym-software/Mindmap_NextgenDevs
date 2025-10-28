// src/main/java/com/example/mindmap/features/mindmap/dto/MindmapCreateRequest.java
package com.example.mindmap.features.mindmap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MindmapCreateRequest(
        @NotBlank @Size(max = 200)
        String name
) {}