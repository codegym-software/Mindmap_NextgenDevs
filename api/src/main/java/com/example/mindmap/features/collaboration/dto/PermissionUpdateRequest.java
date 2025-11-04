// src/main/java/com/example/mindmap/features/collaboration/dto/PermissionUpdateRequest.java
package com.example.mindmap.features.collaboration.dto;

import com.example.mindmap.features.collaboration.Permission;
import jakarta.validation.constraints.NotNull;

public record PermissionUpdateRequest(
        @NotNull
        Permission permission
) {}
