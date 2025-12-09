package com.example.mindmap.features.user;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.core.exception.ResourceNotFoundException;
import com.example.mindmap.features.collaboration.Collaboration;
import com.example.mindmap.features.collaboration.CollaborationRepository;
import com.example.mindmap.features.user.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ChangePasswordRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CognitoIdentityProviderException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserType;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final CollaborationRepository collaborationRepository;
    private final AuthUtils authUtils;
    private final CognitoIdentityProviderClient cognitoClient;

    @Value("${app.security.cognito-user-pool-id}")
    private String userPoolId;

    public UserService(UserRepository userRepository,
                       CollaborationRepository collaborationRepository,
                       AuthUtils authUtils,
                       CognitoIdentityProviderClient cognitoClient) {
        this.userRepository = userRepository;
        this.collaborationRepository = collaborationRepository;
        this.authUtils = authUtils;
        this.cognitoClient = cognitoClient;
    }

    // ===================================================================
    // SAFE INVITE: MỜI USER QUA EMAIL (DÙ CHƯA TỪNG LOGIN)
    // ===================================================================

    /**
     * Logic Mời Nâng cao (Safe Invite):
     * 1. Tìm trong DB.
     * 2. Tìm trên Cognito.
     * 3. Nếu lỗi hoặc không thấy -> Tạo User PENDING (ID tạm).
     */
    @Transactional
    public User getOrCreateUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> {
                    try {
                        // Thử kéo từ Cognito về (ID thật)
                        return fetchUserFromCognitoAndCreateLocal(email);
                    } catch (Exception e) {
                        // Fallback: không gọi được AWS hoặc chưa có user trên Cognito
                        log.warn("Cognito lookup failed/not found for {}. Creating PENDING user.", email, e);
                        return createPendingUser(email);
                    }
                });
    }

    /**
     * Tạo user tạm với trạng thái PENDING_VERIFICATION.
     * Dùng khi mời người chưa đăng ký Cognito hoặc lỗi gọi AWS.
     */
    private User createPendingUser(String email) {
        User newUser = new User();
        newUser.setId(UUID.randomUUID().toString()); // ID tạm thời
        newUser.setEmail(email);
        String displayName = email != null ? email.split("@")[0] : "User";
        newUser.setDisplayName(displayName);
        newUser.setAvatarUrl(createDefaultAvatarUrl(displayName));
        newUser.setStatus(User.UserStatus.PENDING_VERIFICATION);
        newUser.setSettings(new User.UserSettings());
        // cognitoUsername để null (chưa có)
        return userRepository.save(newUser);
    }

    /**
     * Kéo thông tin user từ Cognito theo email và lưu local với ID thật.
     */
    private User fetchUserFromCognitoAndCreateLocal(String email) {
        ListUsersRequest request = ListUsersRequest.builder()
                .userPoolId(userPoolId)
                .filter("email = \"" + email + "\"")
                .limit(1)
                .build();

        ListUsersResponse response = cognitoClient.listUsers(request);

        if (response.users().isEmpty()) {
            throw new ResourceNotFoundException("User not found in Cognito");
        }

        UserType cognitoUser = response.users().get(0);

        // ✅ LẤY sub TỪ attributes
        String realUuid = null;
        String displayName = email != null ? email.split("@")[0] : "User";

        for (AttributeType attr : cognitoUser.attributes()) {
            switch (attr.name()) {
                case "sub" -> realUuid = attr.value();
                case "name" -> displayName = attr.value();
            }
        }

        if (realUuid == null) {
            throw new IllegalStateException("Cognito user is missing 'sub' attribute");
        }

        log.info("Syncing user from Cognito to local DB - Email: {}, UUID(sub): {}", email, realUuid);

        User newUser = new User();
        newUser.setId(realUuid);                    // 👈 ID = sub
        newUser.setEmail(email);
        newUser.setDisplayName(displayName);
        newUser.setAvatarUrl(createDefaultAvatarUrl(displayName));
        newUser.setCognitoUsername(cognitoUser.username()); // 👈 username vẫn lưu riêng
        newUser.setStatus(User.UserStatus.ACTIVE);
        newUser.setSettings(new User.UserSettings());

        return userRepository.save(newUser);
    }

    // ===================================================================
    // SMART SYNC & MERGE KHI LOGIN QUA JWT
    // ===================================================================

    /**
     * Logic Đồng bộ khi Login (Smart Sync & Merge):
     * - Nếu đã có user với ID thật → update thông tin.
     * - Nếu chưa có nhưng tồn tại user tạm theo email → merge:
     *   + Chuyển mọi Collaboration từ ID tạm sang ID thật.
     *   + Xóa user tạm, tạo user thật.
     * - Nếu hoàn toàn mới → tạo user mới.
     */
    @Transactional
    public User syncUserFromJwt(Jwt jwt) {
        String realUserId = jwt.getSubject(); // UUID từ Cognito (chân lý)
        if (realUserId == null) {
            throw new IllegalArgumentException("JWT 'sub' claim is missing.");
        }

        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        String username = jwt.getClaimAsString("username");
        String picture = jwt.getClaimAsString("picture");

        String displayName = Optional.ofNullable(name)
                .orElseGet(() -> Optional.ofNullable(username)
                        .orElseGet(() -> Optional.ofNullable(email)
                                .map(e -> e.split("@")[0])
                                .orElse("User")));

        // 1. Tìm xem user đã tồn tại bằng ID thật chưa
        Optional<User> existingUserById = userRepository.findById(realUserId);
        if (existingUserById.isPresent()) {
            User user = existingUserById.get();
            boolean changed = false;

            if (email != null && !email.equals(user.getEmail())) {
                user.setEmail(email);
                changed = true;
            }
            if (!displayName.equals(user.getDisplayName())) {
                user.setDisplayName(displayName);
                changed = true;
            }
            if (picture != null && !picture.equals(user.getAvatarUrl())) {
                user.setAvatarUrl(picture);
                changed = true;
            }
            if (username != null && !username.equals(user.getCognitoUsername())) {
                user.setCognitoUsername(username);
                changed = true;
            }
            if (user.getStatus() == null || user.getStatus() == User.UserStatus.PENDING_VERIFICATION) {
                user.setStatus(User.UserStatus.ACTIVE);
                changed = true;
            }

            return changed ? userRepository.save(user) : user;
        }

        // 2. Nếu chưa có ID thật, kiểm tra xem có Email trùng không (Do được mời trước đó)
        if (email != null) {
            Optional<User> existingUserByEmail = userRepository.findByEmail(email);
            if (existingUserByEmail.isPresent()) {
                // == PHÁT HIỆN USER TẠM / USER ĐƯỢC MỜI ==
                User pendingUser = existingUserByEmail.get();
                String tempId = pendingUser.getId();

                log.info("Merging PENDING user [{}] into REAL user [{}]", tempId, realUserId);

                // A. Migrate quyền (Collaborations) từ ID tạm -> ID thật
                List<Collaboration> pendingCollabs = collaborationRepository.findByUserId(tempId);
                for (Collaboration col : pendingCollabs) {
                    col.setUserId(realUserId);
                }
                collaborationRepository.saveAll(pendingCollabs);

                // B. Xóa user tạm
                userRepository.deleteById(tempId);

                // C. Tạo User thật (để lần sau login sẽ vào case 1)
                User realUser = new User();
                realUser.setId(realUserId);
                realUser.setEmail(email);
                realUser.setDisplayName(displayName);
                realUser.setAvatarUrl(picture != null && !picture.isBlank()
                        ? picture
                        : createDefaultAvatarUrl(displayName));
                realUser.setCognitoUsername(username);
                realUser.setStatus(User.UserStatus.ACTIVE);
                realUser.setSettings(
                        pendingUser.getSettings() != null
                                ? pendingUser.getSettings()
                                : new User.UserSettings()
                );

                return userRepository.save(realUser);
            }
        }

        // 3. User mới tinh -> Tạo mới
        log.info("First-time login sync for user ID: {}", realUserId);
        User newUser = new User();
        newUser.setId(realUserId);
        newUser.setEmail(email);
        newUser.setDisplayName(displayName);
        newUser.setAvatarUrl(picture != null && !picture.isBlank()
                ? picture
                : createDefaultAvatarUrl(displayName));
        newUser.setCognitoUsername(username);
        newUser.setStatus(User.UserStatus.ACTIVE);
        newUser.setSettings(new User.UserSettings());

        return userRepository.save(newUser);
    }

    // ===================================================================
    // [MỚI] ADMIN TOOL: SYNC TOÀN BỘ USER TỪ COGNITO VỀ MONGODB
    // ===================================================================

    /**
     * Admin tool: quét toàn bộ user trong Cognito User Pool và đồng bộ về MongoDB.
     * - ID local = sub của Cognito.
     * - Upsert (tạo mới nếu chưa có, update nếu đã tồn tại).
     */
    @Transactional
    public String syncAllCognitoUsers() {
        int createdCount = 0;
        int updatedCount = 0;
        String paginationToken = null;

        do {
            // 1. Gọi Cognito lấy danh sách (phân trang)
            ListUsersRequest.Builder requestBuilder = ListUsersRequest.builder()
                    .userPoolId(userPoolId)
                    .limit(60); // Max limit của AWS

            if (paginationToken != null) {
                requestBuilder.paginationToken(paginationToken);
            }

            ListUsersResponse response = cognitoClient.listUsers(requestBuilder.build());
            paginationToken = response.paginationToken();

            // 2. Duyệt qua từng user và lưu vào DB
            for (UserType cognitoUser : response.users()) {
                try {
                    String sub = null;
                    String email = null;
                    String name = "User";

                    // Trích xuất attributes
                    for (AttributeType attr : cognitoUser.attributes()) {
                        switch (attr.name()) {
                            case "sub" -> sub = attr.value();
                            case "email" -> email = attr.value();
                            case "name" -> name = attr.value();
                            // Fallback nếu không có name
                            case "given_name" -> name = attr.value();
                        }
                    }

                    if (sub == null) continue; // Bỏ qua nếu user lỗi không có sub

                    // 3. Upsert vào MongoDB
                    Optional<User> existingUser = userRepository.findById(sub);

                    if (existingUser.isPresent()) {
                        // Update nếu thông tin thay đổi
                        User u = existingUser.get();
                        boolean changed = false;

                        if (email != null && !email.equals(u.getEmail())) {
                            u.setEmail(email);
                            changed = true;
                        }
                        if (!name.equals(u.getDisplayName())) {
                            u.setDisplayName(name);
                            changed = true;
                        }
                        if (u.getCognitoUsername() == null) {
                            u.setCognitoUsername(cognitoUser.username());
                            changed = true;
                        }

                        if (changed) {
                            userRepository.save(u);
                            updatedCount++;
                        }
                    } else {
                        // Create mới
                        User newUser = new User();
                        newUser.setId(sub); // QUAN TRỌNG: ID phải khớp sub của Cognito
                        newUser.setEmail(email);
                        newUser.setDisplayName(name);
                        newUser.setCognitoUsername(cognitoUser.username());
                        newUser.setAvatarUrl(createDefaultAvatarUrl(name));
                        newUser.setStatus(User.UserStatus.ACTIVE);
                        newUser.setSettings(new User.UserSettings());

                        userRepository.save(newUser);
                        createdCount++;
                    }

                } catch (Exception e) {
                    log.error("Error syncing user {}", cognitoUser.username(), e);
                }
            }

        } while (paginationToken != null); // Lặp cho đến khi hết trang

        log.info("Sync complete. Created: {}, Updated: {}", createdCount, updatedCount);
        return String.format("Sync complete. Created: %d, Updated: %d users.", createdCount, updatedCount);
    }

    // ===================================================================
    // CÁC HÀM CŨ - PASSWORD, PROFILE, SETTINGS
    // ===================================================================

    public void changeCurrentUserPassword(PasswordChangeRequest request) {
        String accessToken = authUtils.getCurrentJwt()
                .map(Jwt::getTokenValue)
                .orElseThrow(() -> new IllegalStateException("Access token not found in SecurityContext"));

        ChangePasswordRequest cognitoRequest = ChangePasswordRequest.builder()
                .accessToken(accessToken)
                .previousPassword(request.oldPassword())
                .proposedPassword(request.newPassword())
                .build();

        try {
            cognitoClient.changePassword(cognitoRequest);
            log.info("Password changed successfully");
        } catch (CognitoIdentityProviderException e) {
            log.warn("Failed to change password: {}", e.awsErrorDetails().errorMessage());
            throw e;
        }
    }

    /**
     * Lấy profile user hiện tại – luôn gọi syncUserFromJwt để DB luôn nhất quán.
     */
    public UserProfileDto getCurrentUserProfile() {
        Jwt jwt = authUtils.getCurrentJwt()
                .orElseThrow(() -> new IllegalStateException("JWT token not found"));
        User user = syncUserFromJwt(jwt);
        return mapToProfileDto(user);
    }

    @Transactional
    public UserProfileDto updateCurrentUserProfile(UserProfileDto profileUpdate) {
        String userId = authUtils.getRequiredCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (user.getStatus() == User.UserStatus.GUEST && profileUpdate.email() != null) {
            throw new AccessDeniedException("Guest users cannot change their email.");
        }

        boolean updated = false;

        if (profileUpdate.displayName() != null
                && !profileUpdate.displayName().equals(user.getDisplayName())) {
            user.setDisplayName(profileUpdate.displayName());
            updated = true;
        }
        if (profileUpdate.avatarUrl() != null
                && !profileUpdate.avatarUrl().equals(user.getAvatarUrl())) {
            user.setAvatarUrl(profileUpdate.avatarUrl());
            updated = true;
        }

        if (updated) {
            user = userRepository.save(user);
            log.info("Profile updated for user {}", userId);
        }

        return mapToProfileDto(user);
    }

    @Transactional(readOnly = true)
    public UserSettingsDto getCurrentUserSettings() {
        String userId = authUtils.getRequiredCurrentUserId();
        User user = findUserById(userId);
        return mapToSettingsDto(user.getSettings());
    }

    @Transactional
    public UserSettingsDto updateUserSettings(UserSettingsDto settingsUpdate) {
        String userId = authUtils.getRequiredCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        User.UserSettings s = user.getSettings() != null
                ? user.getSettings()
                : new User.UserSettings();

        boolean updated = false;

        if (settingsUpdate.defaultEditorThemeId() != null
                && !settingsUpdate.defaultEditorThemeId().equals(s.getDefaultEditorThemeId())) {
            s.setDefaultEditorThemeId(settingsUpdate.defaultEditorThemeId());
            updated = true;
        }
        if (settingsUpdate.language() != null
                && !settingsUpdate.language().equals(s.getLanguage())) {
            s.setLanguage(settingsUpdate.language());
            updated = true;
        }
        if (settingsUpdate.colorMode() != null
                && !settingsUpdate.colorMode().equals(s.getColorMode())) {
            s.setColorMode(settingsUpdate.colorMode());
            updated = true;
        }
        if (settingsUpdate.preferredLayout() != null
                && !settingsUpdate.preferredLayout().equals(s.getPreferredLayout())) {
            s.setPreferredLayout(settingsUpdate.preferredLayout());
            updated = true;
        }

        if (updated) {
            user.setSettings(s);
            user = userRepository.save(user);
            log.info("Settings updated for user {}", userId);
        }

        return mapToSettingsDto(s);
    }

    public User findUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    // ===================================================================
    // MAPPER & HELPER
    // ===================================================================

    private UserProfileDto mapToProfileDto(User user) {
        return new UserProfileDto(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl()
        );
    }

    private UserSettingsDto mapToSettingsDto(User.UserSettings settings) {
        User.UserSettings s = settings != null ? settings : new User.UserSettings();
        return new UserSettingsDto(
                s.getDefaultEditorThemeId(),
                s.getLanguage(),
                s.getColorMode(),
                s.getPreferredLayout()
        );
    }

    private String createDefaultAvatarUrl(String displayName) {
        try {
            String encoded = URLEncoder.encode(displayName, StandardCharsets.UTF_8);
            return "https://ui-avatars.com/api/?name=" + encoded;
        } catch (Exception e) {
            return "https://ui-avatars.com/api/?name=User";
        }
    }
}
