package com.example.mindmap.features.user;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.core.exception.ResourceNotFoundException;
import com.example.mindmap.features.user.dto.UserProfileDto;
import com.example.mindmap.features.user.dto.UserSettingsDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Use transactional if needed

import java.time.Instant;
import java.util.Optional;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private final UserRepository userRepository;
    private final AuthUtils authUtils; // Inject AuthUtils

    public UserService(UserRepository userRepository, AuthUtils authUtils) {
        this.userRepository = userRepository;
        this.authUtils = authUtils;
    }

    /**
     * Gets the current user's profile from the database, syncing from JWT if not found or outdated.
     */
    public UserProfileDto getCurrentUserProfile() {
        Jwt jwt = authUtils.getCurrentJwt().orElseThrow(() -> new IllegalStateException("JWT token not found for user profile sync"));
        User user = syncUserFromJwt(jwt);
        return mapToProfileDto(user);
    }

    /**
     * Updates the current user's profile (displayName, avatarUrl).
     */
    @Transactional // Ensure atomicity
    public UserProfileDto updateCurrentUserProfile(UserProfileDto profileUpdate) {
        String userId = authUtils.getRequiredCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        boolean updated = false;
        if (profileUpdate.displayName() != null && !profileUpdate.displayName().equals(user.getDisplayName())) {
            user.setDisplayName(profileUpdate.displayName());
            updated = true;
        }
        if (profileUpdate.avatarUrl() != null && !profileUpdate.avatarUrl().equals(user.getAvatarUrl())) {
            // Add validation for URL format if necessary
            user.setAvatarUrl(profileUpdate.avatarUrl());
            updated = true;
        }

        if (updated) {
            user.setUpdatedAt(Instant.now());
            user = userRepository.save(user);
            log.info("Updated profile for user {}", userId);
        }
        return mapToProfileDto(user);
    }

     /**
      * Updates the current user's settings.
      */
     @Transactional
     public UserSettingsDto updateUserSettings(UserSettingsDto settingsUpdate) {
         String userId = authUtils.getRequiredCurrentUserId();
         User user = userRepository.findById(userId)
                 .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

         boolean updated = false;
         User.UserSettings currentSettings = user.getSettings() != null ? user.getSettings() : new User.UserSettings();

         if (settingsUpdate.defaultEditorThemeId() != null && !settingsUpdate.defaultEditorThemeId().equals(currentSettings.getDefaultEditorThemeId())) {
             // Optional: Validate theme ID exists in editor_themes collection here
             currentSettings.setDefaultEditorThemeId(settingsUpdate.defaultEditorThemeId());
             updated = true;
         }
         if (settingsUpdate.language() != null && !settingsUpdate.language().equals(currentSettings.getLanguage())) {
            // Optional: Validate language code
            currentSettings.setLanguage(settingsUpdate.language());
            updated = true;
         }

         if (updated) {
             user.setSettings(currentSettings);
             user.setUpdatedAt(Instant.now());
             user = userRepository.save(user);
             log.info("Updated settings for user {}", userId);
         }
         return mapToSettingsDto(user.getSettings());
     }


    /**
     * Finds a user by ID or throws ResourceNotFoundException.
     * Internal helper.
     */
    public User findUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }


    // --- Internal Helpers ---

    /**
     * Synchronizes user data from JWT into the local database.
     * Creates the user if they don't exist. Updates if claims have changed.
     */
    private User syncUserFromJwt(Jwt jwt) {
        String userId = jwt.getSubject();
        if (userId == null) {
            throw new IllegalArgumentException("JWT 'sub' claim is missing.");
        }

        Optional<User> existingUserOpt = userRepository.findById(userId);

        String email = jwt.getClaimAsString("email");
        // Try to get name/display name, fall back to username or email part
        String displayName = Optional.ofNullable(jwt.getClaimAsString("name"))
                .or(() -> Optional.ofNullable(jwt.getClaimAsString("preferred_username")))
                .or(() -> Optional.ofNullable(email).map(e -> e.split("@")[0]))
                .orElse("User " + userId.substring(0, 6)); // Fallback

        // TODO: Get avatar from Cognito claims if available (e.g., 'picture' claim)
        String avatarUrl = jwt.getClaimAsString("picture"); // Common OIDC claim

        if (existingUserOpt.isPresent()) {
            // User exists, check for updates
            User existingUser = existingUserOpt.get();
            boolean needsUpdate = false;
            if (email != null && !email.equals(existingUser.getEmail())) {
                existingUser.setEmail(email);
                needsUpdate = true;
            }
            // Only update displayName if it hasn't been explicitly set by the user?
            // Or always sync from Cognito? Let's sync for now.
             if (!displayName.equals(existingUser.getDisplayName())) {
                 existingUser.setDisplayName(displayName);
                 needsUpdate = true;
             }
             if (avatarUrl != null && !avatarUrl.equals(existingUser.getAvatarUrl())) {
                 existingUser.setAvatarUrl(avatarUrl);
                 needsUpdate = true;
             }

            if (needsUpdate) {
                existingUser.setUpdatedAt(Instant.now());
                log.info("Syncing updated claims for user {}", userId);
                return userRepository.save(existingUser);
            } else {
                return existingUser;
            }
        } else {
            // User does not exist, create new
            log.info("Creating new user {} from JWT sync", userId);
            User newUser = new User();
            newUser.setId(userId);
            newUser.setEmail(email);
            newUser.setDisplayName(displayName);
            newUser.setAvatarUrl(avatarUrl); // Set avatar on creation
            newUser.setCognitoUsername(jwt.getClaimAsString("username")); // Or preferred_username
            newUser.setStatus(User.UserStatus.ACTIVE);
            newUser.setCreatedAt(Instant.now());
            newUser.setUpdatedAt(Instant.now());
            // Initialize settings with defaults
            newUser.setSettings(new User.UserSettings());
            return userRepository.save(newUser);
        }
    }


    private UserProfileDto mapToProfileDto(User user) {
        return new UserProfileDto(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl()
        );
    }

     private UserSettingsDto mapToSettingsDto(User.UserSettings settings) {
         if (settings == null) {
             return new UserSettingsDto(null, "en"); // Defaults
         }
         return new UserSettingsDto(
                 settings.getDefaultEditorThemeId(),
                 settings.getLanguage()
         );
     }
}