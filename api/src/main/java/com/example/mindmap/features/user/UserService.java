package com.example.mindmap.features.user;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.core.exception.ResourceNotFoundException;
import com.example.mindmap.features.user.dto.PasswordChangeRequest;
import com.example.mindmap.features.user.dto.UserProfileDto;
import com.example.mindmap.features.user.dto.UserSettingsDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ChangePasswordRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CognitoIdentityProviderException;
import org.springframework.security.access.AccessDeniedException;

// [NEW] Imports for default avatar
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

// import java.time.Instant; // [UPDATE] Không cần thiết khi dùng Auditable
import java.util.Optional;

@Service
public class UserService {

     private static final Logger log = LoggerFactory.getLogger(UserService.class);
     private final UserRepository userRepository;
     private final AuthUtils authUtils;
     private final CognitoIdentityProviderClient cognitoClient;

     public UserService(UserRepository userRepository, AuthUtils authUtils, CognitoIdentityProviderClient cognitoClient) {
         this.userRepository = userRepository;
         this.authUtils = authUtils;
         this.cognitoClient = cognitoClient;
     }
     
     // --- Logic mới (Giai đoạn 2) ---

     /**
      * Thay đổi mật khẩu của user hiện tại trên Cognito.
      * Ném CognitoIdentityProviderException nếu thất bại (sẽ được GlobalExceptionHandler xử lý).
      */
     public void changeCurrentUserPassword(PasswordChangeRequest request) {
         // 1. Lấy access token từ context
         String accessToken = authUtils.getCurrentJwt()
                 .map(Jwt::getTokenValue)
                 .orElseThrow(() -> new IllegalStateException("Access token not found in SecurityContext"));
               
         // 2. Tạo yêu cầu đổi mật khẩu
         ChangePasswordRequest cognitoRequest = ChangePasswordRequest.builder()
                 .accessToken(accessToken)
                 .previousPassword(request.oldPassword())
                 .proposedPassword(request.newPassword())
                 .build();

         try {
             // 3. Gọi Cognito
             cognitoClient.changePassword(cognitoRequest);
             log.info("Successfully changed password for user");
         } catch (CognitoIdentityProviderException e) {
             log.warn("Failed to change password: {}", e.awsErrorDetails().errorMessage());
             throw e; // Ném lại để GlobalExceptionHandler bắt
         }
     }

     // --- Logic đã có ---
     
     /**
      * Gets the current user's profile from the database, syncing from JWT if not found or outdated.
      */
     public UserProfileDto getCurrentUserProfile() {
         Jwt jwt = authUtils.getCurrentJwt().orElseThrow(() -> new IllegalStateException("JWT token not found for user profile sync"));
         User user = syncUserFromJwt(jwt); // Đã hỗ trợ Guest (vì 'sub' là userId)
         return mapToProfileDto(user);
     }

     /**
      * Updates the current user's profile (displayName, avatarUrl).
      */
     @Transactional
     public UserProfileDto updateCurrentUserProfile(UserProfileDto profileUpdate) {
         String userId = authUtils.getRequiredCurrentUserId();
         User user = userRepository.findById(userId)
                 .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

         // Guest không được đổi email
         if (user.getStatus() == User.UserStatus.GUEST && profileUpdate.email() != null) {
             throw new AccessDeniedException("Guest users cannot change their email.");
         }

         boolean updated = false;
         if (profileUpdate.displayName() != null && !profileUpdate.displayName().equals(user.getDisplayName())) {
             user.setDisplayName(profileUpdate.displayName());
             updated = true;
         }
         if (profileUpdate.avatarUrl() != null && !profileUpdate.avatarUrl().equals(user.getAvatarUrl())) {
             user.setAvatarUrl(profileUpdate.avatarUrl());
             updated = true;
         }

         if (updated) {
             // [UPDATE] Xóa setUpdatedAt (Auditable sẽ tự động làm)
             // user.setUpdatedAt(Instant.now());
             user = userRepository.save(user);
             log.info("Updated profile for user {}", userId);
         }
         return mapToProfileDto(user);
     }
     
     /**
      * [NEW] Lấy DTO Cài đặt của người dùng hiện tại
      */
     @Transactional(readOnly = true)
     public UserSettingsDto getCurrentUserSettings() {
         String userId = authUtils.getRequiredCurrentUserId();
         User user = findUserById(userId); // Sử dụng lại hàm helper
         return mapToSettingsDto(user.getSettings()); // Sử dụng lại hàm map
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
             currentSettings.setDefaultEditorThemeId(settingsUpdate.defaultEditorThemeId());
             updated = true;
         }
         if (settingsUpdate.language() != null && !settingsUpdate.language().equals(currentSettings.getLanguage())) {
             currentSettings.setLanguage(settingsUpdate.language());
             updated = true;
         }
         
         if (settingsUpdate.colorMode() != null && !settingsUpdate.colorMode().equals(currentSettings.getColorMode())) {
             currentSettings.setColorMode(settingsUpdate.colorMode());
             updated = true;
         }

         // [FIX] Thêm logic cập nhật cho preferredLayout
         if (settingsUpdate.preferredLayout() != null && !settingsUpdate.preferredLayout().equals(currentSettings.getPreferredLayout())) {
             currentSettings.setPreferredLayout(settingsUpdate.preferredLayout());
             updated = true;
         }

         if (updated) {
             user.setSettings(currentSettings);
             // [UPDATE] Xóa setUpdatedAt (Auditable sẽ tự động làm)
             // user.setUpdatedAt(Instant.now());
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
      * Đồng bộ user từ JWT (Cognito hoặc Guest) vào DB.
      */
     private User syncUserFromJwt(Jwt jwt) {
         String userId = jwt.getSubject();
         if (userId == null)  {
             throw new IllegalArgumentException("JWT 'sub' claim is missing.");
         }

         Optional<User> existingUserOpt = userRepository.findById(userId);

         // Nếu là user GUEST và đã tồn tại, chỉ cần trả về
         if (existingUserOpt.isPresent() && existingUserOpt.get().getStatus() == User.UserStatus.GUEST) {
             return existingUserOpt.get();
         }

         String email = jwt.getClaimAsString("email");
         String displayName = Optional.ofNullable(jwt.getClaimAsString("name"))
                 .or(() -> Optional.ofNullable(jwt.getClaimAsString("preferred_username")))
                 .or(() -> Optional.ofNullable(email).map(e -> e.split("@")[0]))
                 .orElse("User " + userId.substring(0, 6));

         String avatarUrl = jwt.getClaimAsString("picture");

         if (existingUserOpt.isPresent()) {
             User existingUser = existingUserOpt.get();
             boolean needsUpdate = false;
             if (email != null && !email.equals(existingUser.getEmail())) {
                 existingUser.setEmail(email);
                 needsUpdate = true;
             }
             if (!displayName.equals(existingUser.getDisplayName())) {
                 existingUser.setDisplayName(displayName);
                 needsUpdate = true;
             }
             if (avatarUrl != null && !avatarUrl.equals(existingUser.getAvatarUrl())) {
                 existingUser.setAvatarUrl(avatarUrl);
                 needsUpdate = true;
             }

             if (needsUpdate) {
                 // [UPDATE] Xóa setUpdatedAt (Auditable sẽ tự động làm)
                 // existingUser.setUpdatedAt(Instant.now());
                 log.info("Syncing updated claims for user {}", userId);
                 return userRepository.save(existingUser);
             } else {
                 return existingUser;
             }
         } else {
             // User Cognito mới, chưa có trong DB
             log.info("Creating new user {} from JWT sync", userId);
             User newUser = new User();
             newUser.setId(userId);
             newUser.setEmail(email);
             newUser.setDisplayName(displayName);
             
             // [FIX] Thêm avatar default nếu JWT không cung cấp
             newUser.setAvatarUrl((avatarUrl != null && !avatarUrl.isBlank()) ? avatarUrl : createDefaultAvatarUrl(displayName));
             
             newUser.setCognitoUsername(jwt.getClaimAsString("username"));
             newUser.setStatus(User.UserStatus.ACTIVE); // User Cognito luôn là ACTIVE
             
             // [UPDATE] Xóa setCreatedAt/UpdatedAt (Auditable sẽ tự động làm)
             // newUser.setCreatedAt(Instant.now());
             // newUser.setUpdatedAt(Instant.now());
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
         User.UserSettings effectiveSettings = (settings != null) ? settings : new User.UserSettings();
         
         // [FIX] Truyền thêm preferredLayout
         return new UserSettingsDto(
                 effectiveSettings.getDefaultEditorThemeId(),
                 effectiveSettings.getLanguage(),
                 effectiveSettings.getColorMode(),
                 effectiveSettings.getPreferredLayout()
         );
     }

     /**
      * [NEW] Helper tạo URL avatar default
      */
     private String createDefaultAvatarUrl(String displayName) {
         try {
             String encodedName = URLEncoder.encode(displayName, StandardCharsets.UTF_8.name());
             return "https://ui-avatars.com/api/?name=" + encodedName;
         } catch (Exception e) {
             // Fallback an toàn nếu encode lỗi (rất hiếm với UTF-8)
             return "https://ui-avatars.com/api/?name=User";
         }
     }
}