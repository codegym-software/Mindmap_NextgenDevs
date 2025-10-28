// src/main/java/com/example/mindmap/features/mindmap/content/NodeData.java
package com.example.mindmap.features.mindmap.content;

import lombok.Data;

@Data
public class NodeData {
    // SỬA LỖI (Vấn đề #2):
    // Thêm trường 'id' cho Node. Đây là khóa chính để FE (Konva)
    // xác định, cập nhật và liên kết các node.
    private String id;

    private String text;
    private double x;
    private double y;
    private String parentId; // Vẫn hữu ích để biết quan hệ cha-con nhanh
    private NodeStyle style;
    // Thêm các thuộc tính khác như icon, hyperlink ở đây
    // private String icon;
    // private String link;
}
