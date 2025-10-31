/**
 * Định nghĩa các kiểu dữ liệu API chung (không đặc thù cho feature nào).
 * (File này trước đó trống)
 */

/**
 * Định dạng lỗi chung trả về từ Backend (Spring Boot GlobalExceptionHandler)
 */
export interface ApiErrorResponse {
    type: string;       // e.g., "/errors/validation-error"
    title: string;      // e.g., "Validation Error"
    status: number;     // e.g., 400
    detail: string;     // e.g., "Invalid request parameters"
    instance?: string;  // e.g., "/api/mindmaps"
    timestamp: string;  // ISO 8601
    
    // Dành riêng cho lỗi Validation (400)
    details?: Record<string, string>; // e.g., { "name": "must not be blank" }
}

/**
 * Kiểu dữ liệu cho một User Profile (từ BE /api/users/me)
 * Tuân thủ User Story #13
 */
export interface UserProfile {
    id: string; // Cognito sub
    email: string;
    displayName: string;
    avatarUrl?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION';
    createdAt: string; // ISO String
    settings: {
        defaultEditorThemeId?: string;
        language: string;
    };
}
