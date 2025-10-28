// src/main/java/com/example/mindmap/features/collaboration/dto/InviteRequest.java
package com.example.mindmap.features.collaboration.dto;

import com.example.mindmap.features.collaboration.Permission;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

public record InviteRequest(
        @NotNull @Email
        String email,
        @NotNull
        Permission permission
) {}