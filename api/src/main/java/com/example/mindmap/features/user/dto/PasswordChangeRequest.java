// src/main/java/com/example/mindmap/features/user/dto/PasswordChangeRequest.java
package com.example.mindmap.features.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(
        @NotBlank
        String oldPassword,

        @NotBlank
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        // TODO: Thêm regex cho độ phức tạp nếu Cognito yêu cầu
        String newPassword
) {}
