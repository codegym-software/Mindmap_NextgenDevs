package com.example.mindmap.features.user;

import com.example.mindmap.features.user.dto.PasswordChangeRequest;
import com.example.mindmap.features.user.dto.UserProfileDto;
import com.example.mindmap.features.user.dto.UserSettingsDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ===================================================================
    // PROFILE
    // ===================================================================

    // Get current logged-in user's profile
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileDto> getMyProfile() {
        return ResponseEntity.ok(userService.getCurrentUserProfile());
    }

    // Update current logged-in user's profile (e.g., displayName, avatarUrl)
    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileDto> updateMyProfile(
            @Valid @RequestBody UserProfileDto profileUpdate
    ) {
        return ResponseEntity.ok(userService.updateCurrentUserProfile(profileUpdate));
    }

    // ===================================================================
    // PASSWORD
    // ===================================================================

    /**
     * Endpoint #15: Thay đổi mật khẩu của user hiện tại.
     * Chỉ áp dụng cho user Cognito, không áp dụng cho GUEST.
     */
    @PutMapping("/me/password")
    @PreAuthorize("isAuthenticated() and !hasAuthority('SCOPE_GUEST')")
    public ResponseEntity<Void> changeMyPassword(
            @Valid @RequestBody PasswordChangeRequest request
    ) {
        userService.changeCurrentUserPassword(request);
        return ResponseEntity.ok().build();
    }

    // ===================================================================
    // SETTINGS
    // ===================================================================

    @GetMapping("/me/settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserSettingsDto> getMySettings() {
        return ResponseEntity.ok(userService.getCurrentUserSettings());
    }

    @PutMapping("/me/settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserSettingsDto> updateMySettings(
            @Valid @RequestBody UserSettingsDto settingsUpdate
    ) {
        return ResponseEntity.ok(userService.updateUserSettings(settingsUpdate));
    }

    // ===================================================================
    // ADMIN / DEV TOOLS
    // ===================================================================

    /**
     * [MỚI] Endpoint dành cho Admin/Dev để đồng bộ dữ liệu.
     * Tạm thời mở quyền isAuthenticated() để bạn dễ gọi.
     * Sau này nên đổi thành hasRole('ADMIN').
     */
    @PostMapping("/sync-cognito")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> syncCognitoUsers() {
        String result = userService.syncAllCognitoUsers();
        return ResponseEntity.ok(result);
    }
}
