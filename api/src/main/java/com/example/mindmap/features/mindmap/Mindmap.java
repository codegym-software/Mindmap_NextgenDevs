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

    // Manual Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getLastEditedBy() { return lastEditedBy; }
    public void setLastEditedBy(String lastEditedBy) { this.lastEditedBy = lastEditedBy; }

    public MindmapContent getContent() { return content; }
    public void setContent(MindmapContent content) { this.content = content; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public AccessSettings getAccessSettings() { return accessSettings; }
    public void setAccessSettings(AccessSettings accessSettings) { this.accessSettings = accessSettings; }

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    // ==========================================
    // INNER CLASSES & ENUMS
    // ==========================================

    public static class AccessSettings {
        private boolean isPublic = false;

        // Level truy cập công khai: DISABLED, VIEW, hoặc EDIT
        private PublicAccessLevel publicAccessLevel = PublicAccessLevel.DISABLED;

        // Cấu hình hiển thị trong Workspace (Chuẩn bị cho Giai đoạn 4)
        private WorkspaceVisibility workspaceVisibility = WorkspaceVisibility.PRIVATE;

        // Manual Getters and Setters
        public boolean isPublic() { return isPublic; }
        public void setPublic(boolean isPublic) { this.isPublic = isPublic; }

        public PublicAccessLevel getPublicAccessLevel() { return publicAccessLevel; }
        public void setPublicAccessLevel(PublicAccessLevel publicAccessLevel) { this.publicAccessLevel = publicAccessLevel; }

        public WorkspaceVisibility getWorkspaceVisibility() { return workspaceVisibility; }
        public void setWorkspaceVisibility(WorkspaceVisibility workspaceVisibility) { this.workspaceVisibility = workspaceVisibility; }
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