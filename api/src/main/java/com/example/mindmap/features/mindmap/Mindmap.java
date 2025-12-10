// src/main/java/com/example/mindmap/features/mindmap/Mindmap.java
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

    private MindmapContent content;

    private List<String> tags = new ArrayList<>();

    private AccessSettings accessSettings = new AccessSettings();

    private String workspaceId;

    @Version
    private Long version;

    // Getters and Setters
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

    public enum PublicAccessLevel {
        VIEW, DISABLED
    }

    public static class AccessSettings {
        private boolean isPublic = false;
        private PublicAccessLevel publicAccessLevel = PublicAccessLevel.DISABLED;

        public boolean isPublic() { return isPublic; }
        public void setPublic(boolean aPublic) { isPublic = aPublic; }
        
        public PublicAccessLevel getPublicAccessLevel() { return publicAccessLevel; }
        public void setPublicAccessLevel(PublicAccessLevel publicAccessLevel) { this.publicAccessLevel = publicAccessLevel; }
    }
}
