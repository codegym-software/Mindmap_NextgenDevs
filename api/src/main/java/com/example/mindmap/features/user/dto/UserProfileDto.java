package com.example.mindmap.features.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
// Using Records for immutable DTOs (Java 16+)
public record UserProfileDto(
    String id, // Usually read-only from client perspective

    @Email
    String email, // Read-only

    @Size(min = 1, max = 100)
    String displayName,

    @Size(max = 2048) // Allow longer URLs
    // @URL // Consider adding URL validation if needed
    String avatarUrl
) {}