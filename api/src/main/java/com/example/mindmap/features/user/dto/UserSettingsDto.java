package com.example.mindmap.features.user.dto;

import jakarta.validation.constraints.Size;

public record UserSettingsDto(
        String defaultEditorThemeId, // ID referencing editor_themes

        @Size(min = 2, max = 10) // e.g., "en", "vi", "en-US"
        String language,

        // [UPDATE] Đã có từ file gốc
        String colorMode,

        // [FIX] Thêm preferredLayout vào DTO
        String preferredLayout
) {}