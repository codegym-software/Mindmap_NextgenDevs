package com.example.mindmap.features.user;

import com.example.mindmap.core.model.Auditable;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("users")
public class User extends Auditable {

    @Id
    private String id;

    @Indexed
    private String email;

    @Indexed
    private String displayName;

    private String avatarUrl;

    private String cognitoUsername;

    private UserStatus status = UserStatus.ACTIVE;

    private UserSettings settings = new UserSettings();

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    
    public String getCognitoUsername() { return cognitoUsername; }
    public void setCognitoUsername(String cognitoUsername) { this.cognitoUsername = cognitoUsername; }
    
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    
    public UserSettings getSettings() { return settings; }
    public void setSettings(UserSettings settings) { this.settings = settings; }

    public static class UserSettings {
        private String defaultEditorThemeId;
        private String language = "vi";
        private String colorMode = "light";
        private String preferredLayout = "FREEFORM";

        public String getDefaultEditorThemeId() { return defaultEditorThemeId; }
        public void setDefaultEditorThemeId(String defaultEditorThemeId) { this.defaultEditorThemeId = defaultEditorThemeId; }
        
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }
        
        public String getColorMode() { return colorMode; }
        public void setColorMode(String colorMode) { this.colorMode = colorMode; }
        
        public String getPreferredLayout() { return preferredLayout; }
        public void setPreferredLayout(String preferredLayout) { this.preferredLayout = preferredLayout; }
    }

    public enum UserStatus {
        ACTIVE, INACTIVE, PENDING_VERIFICATION, GUEST
    }
}
