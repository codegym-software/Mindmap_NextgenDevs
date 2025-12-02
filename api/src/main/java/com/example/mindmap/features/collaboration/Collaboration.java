// src/main/java/com/example/mindmap/features/collaboration/Collaboration.java
package com.example.mindmap.features.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.example.mindmap.core.model.Auditable;
import jakarta.validation.constraints.NotNull;

@Document("collaborators")
public class Collaboration extends Auditable {
    @Id
    private String id;

    @NotNull
    private String mindmapId;

    @NotNull
    private String userId;

    @NotNull
    private Permission permission;

    private String invitedBy;

    private InviteStatus status = InviteStatus.ACCEPTED;

    // Getters and Setters
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
    
    public enum InviteStatus {
        PENDING, ACCEPTED, REJECTED
    }
}