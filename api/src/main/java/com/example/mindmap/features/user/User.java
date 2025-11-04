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
    private String id; // Cognito sub HOẶC Guest ID

    @Indexed(unique = true, sparse = true) // sparse = true vì Guest có thể có email trùng (hoặc giả)
    private String email;

    @Indexed
    private String displayName;

    private String avatarUrl;

    private String cognitoUsername;

    private UserStatus status = UserStatus.ACTIVE;

    private UserSettings settings = new UserSettings();

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    @Data
    public static class UserSettings {
        private String defaultEditorThemeId;
        private String language = "en";
    }

    public enum UserStatus {
        ACTIVE,
        INACTIVE,
        PENDING_VERIFICATION,
        GUEST // Mới: Thêm trạng thái Guest
    }
}
