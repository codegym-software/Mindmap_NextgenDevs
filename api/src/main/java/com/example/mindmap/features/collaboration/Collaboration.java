package com.example.mindmap.features.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.example.mindmap.core.model.Auditable;
import jakarta.validation.constraints.NotNull;

@Document(collection = "collaborators")
public class Collaboration extends Auditable {
    @Id
    private String id;

    @NotNull
    private String mindmapId;

    @NotNull
    private String userId;

    @NotNull
    private Permission permission; // OWNER, EDITOR, VIEWER

    private String invitedBy;

    // Trạng thái mời: PENDING (chờ duyệt), ACCEPTED (đã vào), REJECTED
    private InviteStatus status = InviteStatus.ACCEPTED;

    // Loại mời: INVITE (chủ động mời), REQUEST_ACCESS (xin vào)
    private InviteType type; 
    
    private String decidedBy; // Ai là người duyệt
    
    private java.time.Instant decidedAt; // Thời điểm duyệt

    // Constructors
    public Collaboration() {}

    // Manual Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMindmapId() { return mindmapId; }
    public void setMindmapId(String mindmapId) { this.mindmapId = mindmapId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Permission getPermission() { return permission; }
    public void setPermission(Permission permission) { this.permission = permission; }

    public String getInvitedBy() { return invitedBy; }
    public void setInvitedBy(String invitedBy) { this.invitedBy = invitedBy; }

    public InviteStatus getStatus() { return status; }
    public void setStatus(InviteStatus status) { this.status = status; }

    public InviteType getType() { return type; }
    public void setType(InviteType type) { this.type = type; }

    public String getDecidedBy() { return decidedBy; }
    public void setDecidedBy(String decidedBy) { this.decidedBy = decidedBy; }

    public java.time.Instant getDecidedAt() { return decidedAt; }
    public void setDecidedAt(java.time.Instant decidedAt) { this.decidedAt = decidedAt; }
    
    public enum InviteStatus {
        PENDING, ACCEPTED, REJECTED
    }
    
    public enum InviteType {
        INVITE, REQUEST_ACCESS
    }
}