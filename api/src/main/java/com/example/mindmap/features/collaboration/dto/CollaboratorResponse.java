// src/main/java/com/example/mindmap/features/collaboration/dto/CollaboratorResponse.java
package com.example.mindmap.features.collaboration.dto;

import com.example.mindmap.features.collaboration.Permission;

public record CollaboratorResponse(
        String userId,
        String displayName,
        String avatarUrl,
        Permission permission
) {}