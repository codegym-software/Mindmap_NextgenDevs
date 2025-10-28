package com.example.mindmap.features.user;

import com.example.mindmap.features.user.dto.UserProfileDto;
import com.example.mindmap.features.user.dto.UserSettingsDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize; // For method security
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // Get current logged-in user's profile
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()") // Ensure user is logged in
    public ResponseEntity<UserProfileDto> getMyProfile() {
        // UserService handles syncing from JWT if needed
        return ResponseEntity.ok(userService.getCurrentUserProfile());
    }

    // Update current logged-in user's profile (e.g., displayName, avatarUrl)
    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileDto> updateMyProfile(@Valid @RequestBody UserProfileDto profileUpdate) {
         // Only allow updating specific fields, UserService handles logic
         // Ensure the ID in the body isn't used to update someone else
        return ResponseEntity.ok(userService.updateCurrentUserProfile(profileUpdate));
    }

    // Get current user's settings
    @GetMapping("/me/settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserSettingsDto> getMySettings() {
        // Logic to get settings is typically part of getting the full user profile
        // but can be a separate endpoint if settings are large or frequently accessed
        UserProfileDto profile = userService.getCurrentUserProfile(); // Reuses sync logic
        User user = userService.findUserById(profile.id()); // Get full user object
        return ResponseEntity.ok(new UserSettingsDto(
            user.getSettings().getDefaultEditorThemeId(),
            user.getSettings().getLanguage()
        ));
    }

     // Update current user's settings
     @PutMapping("/me/settings")
     @PreAuthorize("isAuthenticated()")
     public ResponseEntity<UserSettingsDto> updateMySettings(@Valid @RequestBody UserSettingsDto settingsUpdate) {
         return ResponseEntity.ok(userService.updateUserSettings(settingsUpdate));
     }
}