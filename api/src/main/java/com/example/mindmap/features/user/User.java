package com.example.mindmap.features.user;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document("users")
public class User {

    @Id
    private String id; // Cognito sub

    @Indexed(unique = true)
    private String email;

    @Indexed
    private String displayName;

    private String avatarUrl; // Essential

    private String cognitoUsername;

    private UserStatus status = UserStatus.ACTIVE;

    private UserSettings settings = new UserSettings(); // Initialize with defaults

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    // Inner class for settings
    @Data
    public static class UserSettings {
        private String defaultEditorThemeId; // Reference to EditorTheme
        private String language = "en"; // Default language
    }

    public enum UserStatus {
        ACTIVE, INACTIVE, PENDING_VERIFICATION
    }
}