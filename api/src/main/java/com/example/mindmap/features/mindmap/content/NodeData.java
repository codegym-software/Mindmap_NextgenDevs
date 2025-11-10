package com.example.mindmap.features.mindmap.content;

import lombok.Data;

/**
 * NodeData đại diện cho 1 node trong Mindmap.
 * Chứa tất cả thông tin cần thiết để FE render và BE quản lý logic.
 *
 * ✅ Có id để FE nhận diện node (Konva, canvas, drag & drop)
 * ✅ Hỗ trợ quan hệ cha-con bằng parentId
 * ✅ Hỗ trợ style riêng trên mỗi node
 * ✅ Có thể chứa metadata mở rộng như hyperlink, notes, externalReference
 */

@Data
public class NodeData {

    /**
     * ID duy nhất của node.
     * FE sẽ tự sinh UUID và gửi lên BE trong update request.
     * Đây là key để BE xác định node khi update / delete.
     */
    private String id;

    /**
     * Nội dung text hiển thị trong node.
     */
    private String text;

    /**
     * Tọa độ node trên canvas (FE xử lý, BE chỉ lưu trữ).
     */
    private double x;
    private double y;

    /**
     * ID của node cha (nếu null → node root).
     * FE/BE dựa trên parentId để xây dựng cấu trúc cây.
     */
    private String parentId;

    /**
     * Style riêng của node, ví dụ:
     * - màu nền
     * - màu chữ
     * - fontSize
     * - border radius
     *
     * Nếu null → FE kế thừa style theo theme của Mindmap.
     */
    private NodeStyle style;

    /**
     * FLAG: Node có đang bị thu gọn branch hay không.
     * FE dùng để ẩn con cháu của node nếu collapsed = true.
     */
    private boolean isCollapsed = false;

    /**
     * Siêu liên kết (optional).
     * FE click vào node có hyperlink → mở external URL.
     */
    private String hyperlink;

    /**
     * Ghi chú nội dung chi tiết hơn ngoài text ngắn trên node.
     * Dùng cho các Mindmap có nhiều ghi chú (radial notes).
     */
    private String notes;

    /**
     * Tham chiếu liên kết tới hệ thống khác (Jira, Confluence, SaaS...).
     */
    private ExternalReference externalReference;

    /**
     * Metadata dùng cho liên kết hệ thống ngoài.
     * Ví dụ: liên kết Jira ticket → TASK-123
     */
    @Data
    public static class ExternalReference {
        private String provider; // Ex: "jira", "github-repo", "notion"
        private String id;       // Ex: "TASK-123", "DOC-456"
        private String url;      // FE dùng url như fallback để mở nhanh
    }
}
