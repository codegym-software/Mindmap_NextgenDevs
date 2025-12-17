package com.example.mindmap.features.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.example.mindmap.core.model.Auditable;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    @Builder.Default
    private InviteStatus status = InviteStatus.ACCEPTED;

    // Loại mời: INVITE (chủ động mời), REQUEST_ACCESS (xin vào)
    private InviteType type; 
    
    private String decidedBy; // Ai là người duyệt
    
    private java.time.Instant decidedAt; // Thời điểm duyệt
    
    public enum InviteStatus {
        PENDING, ACCEPTED, REJECTED
    }
    
    public enum InviteType {
        INVITE, REQUEST_ACCESS
    }
    
    // Manual getter/setter for decidedAt (optional - @Data already provides these)
    public java.time.Instant getDecidedAt() {
        return decidedAt;
    }
    
    public void setDecidedAt(java.time.Instant decidedAt) {
        this.decidedAt = decidedAt;
    }
}