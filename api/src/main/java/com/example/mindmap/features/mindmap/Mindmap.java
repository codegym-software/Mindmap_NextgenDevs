// src/main/java/com/example/mindmap/features/mindmap/Mindmap.java
package com.example.mindmap.features.mindmap;

import java.util.List;
import java.util.ArrayList; // Thêm import

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.example.mindmap.core.model.Auditable;
import com.example.mindmap.features.mindmap.content.MindmapContent;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = false)
@Document("mindmaps")
public class Mindmap extends Auditable {
    @Id
    private String id;

    @NotBlank
    private String name;

    @Indexed
    private String ownerId;

    // SỬA LỖI: Khởi tạo các đối tượng lồng nhau
    private MindmapContent content = new MindmapContent();

    private AccessSettings accessSettings = new AccessSettings();

    private String workspaceId;

    @Indexed
    // SỬA LỖI: Khởi tạo List để Spring biết cách tạo (instantiate)
    private List<String> tags = new ArrayList<>();

    private String lastEditedBy;

    @Version
    private Long version;

    @Data
    public static class AccessSettings {
        private boolean isPublic = false;
        private PublicAccessLevel publicAccessLevel = PublicAccessLevel.DISABLED;
    }

    public enum PublicAccessLevel {
        VIEW, DISABLED
    }
}
