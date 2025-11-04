// src/main/java/com/example/mindmap/features/auth/dto/GuestSessionResponse.java
package com.example.mindmap.features.auth.dto;

import com.example.mindmap.features.user.User;

public record GuestSessionResponse(
        String token,
        String userId,
        String displayName,
        User.UserStatus status
) {}
