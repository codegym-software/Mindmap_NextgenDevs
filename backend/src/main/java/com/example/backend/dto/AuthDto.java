// backend/src/main/java/com/example/backend/dto/AuthDto.java
package com.example.backend.dto;

import java.util.Map;

public class AuthDto {

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class RegisterRequest {
        public String email;
        public String password;
    }

    public static class ConfirmRequest {
        public String username; // Dùng username (UUID) thay vì email
        public String code;
    }

    public static class ResendRequest {
        public String username; // Dùng username (UUID) thay vì email
    }

    public static class ForgotPasswordRequest {
        public String username; // Dùng username (UUID) thay vì email
    }

    public static class ResetPasswordRequest {
        public String username; // Dùng username (UUID) thay vì email
        public String code;
        public String newPassword;
    }

    public static class AuthenticationResult {
        public Map<String, Object> result;

        public AuthenticationResult(Map<String, Object> result) {
            this.result = result;
        }
    }

    public static class SignUpResult {
        public Map<String, Object> result;
        public String username; // Thêm username để trả về cho frontend

        public SignUpResult(Map<String, Object> result) {
            this.result = result;
            this.username = (String) result.get("username");
        }
    }

    public static class SuccessResponse {
        public String message;

        public SuccessResponse(String message) {
            this.message = message;
        }
    }

    public static class ErrorResponse {
        public String error;

        public ErrorResponse(String error) {
            this.error = error;
        }
    }
}