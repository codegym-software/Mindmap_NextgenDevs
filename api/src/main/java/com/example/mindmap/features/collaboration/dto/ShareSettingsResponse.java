// src/main/java/com/example/mindmap/features/collaboration/dto/ShareSettingsResponse.java
package com.example.mindmap.features.collaboration.dto;

import com.example.mindmap.features.mindmap.Mindmap;

public record ShareSettingsResponse(
        String mindmapId,
        boolean isPublic,
        Mindmap.PublicAccessLevel publicAccessLevel,
        String shareLink // Trả về link public (nếu có)
) {
    // Helper factory method
    public static ShareSettingsResponse fromMindmap(Mindmap mindmap, String baseUrl) {
        String shareLink = null;
        if (mindmap.getAccessSettings().isPublic() && mindmap.getAccessSettings().getPublicAccessLevel() == Mindmap.PublicAccessLevel.VIEW) {
            // TODO: Tạo token an toàn thay vì chỉ ID
            // Tạm thời dùng ID cho Giai đoạn 1
            shareLink = baseUrl + "/share/" + mindmap.getId();
        }
        
        return new ShareSettingsResponse(
                mindmap.getId(),
                mindmap.getAccessSettings().isPublic(),
                mindmap.getAccessSettings().getPublicAccessLevel(),
                shareLink
        );
    }
}
