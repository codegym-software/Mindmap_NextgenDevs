package com.example.mindmap.features.mindmap;

import java.util.List;
import java.util.ArrayList;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.example.mindmap.core.model.Auditable;
import com.example.mindmap.features.mindmap.content.MindmapContent;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data // Tự động sinh Getter, Setter, toString, equals...
@EqualsAndHashCode(callSuper = false)
@Document("mindmaps")
public class Mindmap extends Auditable {
    @Id
    private String id;

    @NotBlank
    private String name;

    @Indexed
    private String ownerId;

    private String lastEditedBy;

    // Nội dung chính (Nodes, Edges) - Phần UI của bạn nằm trong này
    private MindmapContent content;

    @Indexed
    private List<String> tags = new ArrayList<>();

    // Cấu hình chia sẻ - Phần logic của đồng nghiệp
    private AccessSettings accessSettings = new AccessSettings();

    private String workspaceId;

    // Optimistic Locking để tránh ghi đè dữ liệu khi nhiều người cùng sửa
    @Version
    private Long version;

    // ==========================================
    // INNER CLASSES & ENUMS
    // ==========================================

    @Data // Tự động sinh Getter/Setter cho settings
    public static class AccessSettings {
        private boolean isPublic = false;

        // Level truy cập công khai: DISABLED, VIEW, hoặc EDIT
        private PublicAccessLevel publicAccessLevel = PublicAccessLevel.DISABLED;

        // Cấu hình hiển thị trong Workspace (Chuẩn bị cho Giai đoạn 4)
        private WorkspaceVisibility workspaceVisibility = WorkspaceVisibility.PRIVATE;
    }

    /**
     * Mức độ truy cập qua Public Link
     */
    public enum PublicAccessLevel {
        DISABLED, // Không public (an toàn nhất để default)
        VIEW,     // Ai có link cũng xem được
        EDIT      // Ai có link (và đã login) cũng sửa được
    }

    /**
     * Mức độ hiển thị trong Workspace (Team)
     */
    public enum WorkspaceVisibility {
        PRIVATE,        // Chỉ owner và người được mời
        WORKSPACE_VIEW, // Tất cả thành viên workspace được xem
        WORKSPACE_EDIT  // Tất cả thành viên workspace được sửa
    }
}