// src/main/java/com/example/mindmap/features/mindmap/content/NodeStyle.java
package com.example.mindmap.features.mindmap.content;

import lombok.Data;

@Data
public class NodeStyle {
    private String color; // e.g., "#RRGGBB"
    private String font; // e.g., "Arial"
    private Boolean isBold = false;
    private Boolean isItalic = false;
    private TextAlign textAlign = TextAlign.CENTER;

    public enum TextAlign {
        LEFT, CENTER, RIGHT, JUSTIFY
    }
}