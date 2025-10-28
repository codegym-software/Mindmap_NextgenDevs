package com.example.mindmap.features.editor_theme.dto;

import com.example.mindmap.features.editor_theme.EditorTheme;

// DTO này dùng để GỬI data theme cho frontend
// Sử dụng record để đảm bảo tính bất biến
public record EditorThemeDto(
        String id,
        String name,
        String description,
        EditorTheme.EditorThemeConfig config,
        boolean isSystemTheme,
        String createdBy
) {
}
