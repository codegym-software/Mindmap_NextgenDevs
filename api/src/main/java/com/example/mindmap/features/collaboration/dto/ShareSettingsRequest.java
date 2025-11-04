// src/main/java/com/example/mindmap/features/collaboration/dto/ShareSettingsRequest.java
package com.example.mindmap.features.collaboration.dto;

import com.example.mindmap.features.mindmap.Mindmap;
import jakarta.validation.constraints.NotNull;

public record ShareSettingsRequest(
        @NotNull
        Boolean isPublic,
        
        @NotNull
        Mindmap.PublicAccessLevel publicAccessLevel
) {}
