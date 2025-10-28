package com.example.mindmap.features.editor_theme;

import com.example.mindmap.core.model.Auditable;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

// Dựa trên schema bạn cung cấp
@Data
@EqualsAndHashCode(callSuper = false)
@Document("editor_themes")
public class EditorTheme extends Auditable {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    private String description;

    private EditorThemeConfig config; // Object chứa cấu hình chi tiết

    private boolean isSystemTheme; // true nếu là theme hệ thống

    private String createdBy; // userId nếu do người dùng tạo

    // --- Inner Classes cho cấu hình ---

    @Data
    public static class EditorThemeConfig {
        private Background background;
        private Grid grid;
        private NodeStyleConfig nodeDefaults; // Đổi tên để tránh trùng lặp với NodeStyle của content
        private EdgeStyle edgeDefaults;
    }

    @Data
    public static class Background {
        private String type; // 'color', 'gradient', 'image'
        private String value;
    }

    @Data
    public static class Grid {
        private boolean enabled;
        private String color;
        private int spacing;
    }

    @Data
    public static class NodeStyleConfig {
        private String color;
        private String font;
        private String textAlign;
    }

    @Data
    public static class EdgeStyle {
        private String color;
        private int thickness;
        private String type; // 'bezier', 'straight'
    }
}
