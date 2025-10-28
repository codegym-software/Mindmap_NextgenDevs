// src/main/java/com/example/mindmap/features/mindmap/content/MindmapTheme.java
package com.example.mindmap.features.mindmap.content;

import lombok.Data;

@Data
public class MindmapTheme {
    private String background; // Theme name, e.g., "dark_grid"
    private String connectionType; // e.g., "curved" or "straight"
}