// src/main/java/com/example/mindmap/features/collaboration/Collaboration.java
package com.example.mindmap.features.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.example.mindmap.core.model.Auditable;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = false)
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
    
    public enum InviteStatus {
        PENDING, ACCEPTED, REJECTED
    }
}