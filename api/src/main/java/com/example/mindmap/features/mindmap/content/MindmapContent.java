package com.example.mindmap.features.mindmap.content;

import java.util.List;
import java.util.Map;

import lombok.Data;

@Data
public class MindmapContent {
    // SỬA LỖI (Vấn đề #1):
    // Đổi từ Map<String, NodeData> thành List<NodeData>
    // Điều này khớp với thiết kế và dễ dàng hơn cho FE (Konva) duyệt và render.
    private List<NodeData> nodes;

    private List<EdgeData> edges;
    private MindmapTheme theme;
}
