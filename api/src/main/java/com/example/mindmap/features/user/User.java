package com.example.mindmap.features.user;

import com.example.mindmap.core.model.Auditable; // [UPDATE] Import Auditable
import lombok.Data;
import lombok.EqualsAndHashCode; // [UPDATE] Import
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * User document được lưu trong collection "users" của MongoDB.
 * Đại diện một tài khoản người dùng (bao gồm Guest user và Cognito user).
 * [FIX] Kế thừa Auditable để tự động hóa createdAt/updatedAt
 */
@Data
@NoArgsConstructor
@Document("users")
@EqualsAndHashCode(callSuper = false) // [UPDATE] Thêm vào
public class User extends Auditable { // [UPDATE] Kế thừa Auditable

    /**
     * ID người dùng.
     * - Nếu là user đăng nhập qua Cognito: Cognito Sub ID.
     * - Nếu là user guest: tự sinh UUID.
     */
    @Id
    private String id;

    /**
     * Email của người dùng.
     * @Indexed(unique = true, sparse = true):
     *  - unique: đảm bảo email không bị duplicate giữa các user thật.
     *  - sparse: cho phép các user không có email (Guest): không bị lỗi duplicate.
     */
    @Indexed(unique = true, sparse = true)
    private String email;

    /**
     * Tên hiển thị của user trong hệ thống.
     * Dùng để show avatar/name trên UI.
     */
    @Indexed
    private String displayName;

    /**
     * URL đến avatar của user (lưu trên S3 hoặc external storage).
     */
    private String avatarUrl;

    /**
     * Username do Cognito quản lý, không phải email.
     * Dùng khi cần kết nối Cognito API.
     */
    private String cognitoUsername;

    /**
     * Trạng thái của user (ACTIVE / INACTIVE / PENDING_VERIFICATION / GUEST).
     * Mặc định ACTIVE.
     */
    private UserStatus status = UserStatus.ACTIVE;

    /**
     * Settings cá nhân của user (ngôn ngữ, theme sáng/tối).
     */
    private UserSettings settings = new UserSettings();

    // [UPDATE] Xóa 2 trường createdAt và updatedAt (đã được Auditable quản lý)

    /**
     * Sub-object chứa cấu hình cá nhân hóa của user.
     */
    @Data
    public static class UserSettings {

        /**
         * Theme editor mặc định (nếu user đang dùng editor Mindmap hoặc Markdown).
         * Ví dụ: "monokai", "github-dark", "solarized".
         */
        private String defaultEditorThemeId;

        /**
         * Ngôn ngữ giao diện UI của user.
         * Mặc định tiếng Việt.
         */
        private String language = "vi"; // [FIX] Cập nhật default theo yêu cầu

        /**
         * Theme sáng tối của giao diện mindmap / dashboard.
         * Giá trị hợp lệ:
         * - "light": giao diện sáng
         * - "dark": giao diện tối
         * - "system": tự theo theme của OS
         */
        private String colorMode = "light";

        /**
         * [FIX] Gợi ý layout mặc định.
         * "FREEFORM" | "TREE" | "HORIZONTAL" | "RADIAL"
         */
        private String preferredLayout = "FREEFORM";
    }

    /**
     * Enum phân loại trạng thái tài khoản user.
     */
    public enum UserStatus {
        ACTIVE,                // User hoạt động
        INACTIVE,              // Không sử dụng (tạm khóa)
        PENDING_VERIFICATION,  // Đã đăng ký nhưng chưa xác thực email
        GUEST                  // Không yêu cầu email / Cognito
    }
}