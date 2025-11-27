package com.example.mindmap.features.mindmap.content;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Data;

/**
 * MindmapContent là cấu trúc chính chứa toàn bộ nội dung của 1 Mindmap.
 * - Lưu danh sách Node và Edge để FE render bằng Konva hoặc bất kỳ canvas engine nào.
 * - Không phụ thuộc MongoDB annotation vì đây là sub-object nằm trong collection mindmaps.
 */
@Data
public class MindmapContent {

    /**
     * Chế độ layout của Mindmap.
     * FE sẽ xử lý khác nhau dựa trên layoutMode:
     * - FREEFORM: Người dùng tự do kéo thả node (giống Miro, Figjam, Excalidraw)
     * - TREE_RIGHT: Render dạng cây từ trái sang phải (mindmap truyền thống)
     * - TREE_LEFT: Render dạng cây từ phải sang trái
     * - ORG_CHART: Sơ đồ tổ chức (cây từ trên xuống dưới)
     *
     * Mặc định = "FREEFORM".
     */
    private String layoutMode = "FREEFORM";

    /** Danh sách node trong mindmap */
    private List<NodeData> nodes;

    /** Danh sách các liên kết giữa node với node */
    private List<EdgeData> edges;
    
    private GlobalSettings globalSettings = new GlobalSettings(); 


    /** Theme của mindmap (light | dark) */
    private MindmapTheme theme = MindmapTheme.LIGHT;

    /**
     * Enum MindmapTheme hỗ trợ deserialize từ string "light"/"dark"
     */
    public enum MindmapTheme {
        LIGHT,
        DARK;

        @JsonCreator
        public static MindmapTheme from(String value) {
            return MindmapTheme.valueOf(value.toUpperCase());
        }

        @JsonValue
        public String toValue() {
            return this.name().toLowerCase();
        }
    }
}
