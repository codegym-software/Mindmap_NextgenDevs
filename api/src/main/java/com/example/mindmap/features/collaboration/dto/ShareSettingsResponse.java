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
        Mindmap.AccessSettings access = mindmap.getAccessSettings();
        
        // Kiểm tra nếu là Public (VIEW hoặc EDIT) thì sinh link
        if (access.isPublic() && 
           (access.getPublicAccessLevel() == Mindmap.PublicAccessLevel.VIEW || 
            access.getPublicAccessLevel() == Mindmap.PublicAccessLevel.EDIT)) {
            
            // TODO: Giai đoạn sau nên mã hóa ID này thành token ngắn gọn hơn
            shareLink = baseUrl + "/share/" + mindmap.getId();
        }
        
        return new ShareSettingsResponse(
                mindmap.getId(),
                access.isPublic(),
                access.getPublicAccessLevel(),
                shareLink
        );
    }
}