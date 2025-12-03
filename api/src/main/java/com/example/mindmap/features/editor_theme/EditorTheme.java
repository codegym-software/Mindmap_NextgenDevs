package com.example.mindmap.features.editor_theme;

import com.example.mindmap.core.model.Auditable;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

// Dựa trên schema bạn cung cấp
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

    // Getter và Setter methods
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public EditorThemeConfig getConfig() {
        return config;
    }

    public void setConfig(EditorThemeConfig config) {
        this.config = config;
    }

    public boolean isSystemTheme() {
        return isSystemTheme;
    }

    public void setSystemTheme(boolean systemTheme) {
        isSystemTheme = systemTheme;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    // --- Inner Classes cho cấu hình ---

    public static class EditorThemeConfig {
        private Background background;
        private Grid grid;
        private NodeStyleConfig nodeDefaults; // Đổi tên để tránh trùng lặp với NodeStyle của content
        private EdgeStyle edgeDefaults;

        public Background getBackground() { return background; }
        public void setBackground(Background background) { this.background = background; }
        public Grid getGrid() { return grid; }
        public void setGrid(Grid grid) { this.grid = grid; }
        public NodeStyleConfig getNodeDefaults() { return nodeDefaults; }
        public void setNodeDefaults(NodeStyleConfig nodeDefaults) { this.nodeDefaults = nodeDefaults; }
        public EdgeStyle getEdgeDefaults() { return edgeDefaults; }
        public void setEdgeDefaults(EdgeStyle edgeDefaults) { this.edgeDefaults = edgeDefaults; }
    }

    public static class Background {
        private String type; // 'color', 'gradient', 'image'
        private String value;

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }
    }

    public static class Grid {
        private boolean enabled;
        private String color;
        private int spacing;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public int getSpacing() { return spacing; }
        public void setSpacing(int spacing) { this.spacing = spacing; }
    }

    public static class NodeStyleConfig {
        private String color;
        private String font;
        private String textAlign;

        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public String getFont() { return font; }
        public void setFont(String font) { this.font = font; }
        public String getTextAlign() { return textAlign; }
        public void setTextAlign(String textAlign) { this.textAlign = textAlign; }
    }

    public static class EdgeStyle {
        private String color;
        private int thickness;
        private String type; // 'bezier', 'straight'

        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public int getThickness() { return thickness; }
        public void setThickness(int thickness) { this.thickness = thickness; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
    }
}
