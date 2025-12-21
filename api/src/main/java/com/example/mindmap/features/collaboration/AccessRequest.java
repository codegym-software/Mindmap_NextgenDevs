package com.example.mindmap.features.collaboration;

import com.example.mindmap.core.model.Auditable;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "access_requests")
@CompoundIndexes({
    // Mỗi user chỉ có 1 request đang chờ cho 1 mindmap
    @CompoundIndex(name = "mindmap_user_request_idx", def = "{'mindmapId': 1, 'userId': 1}", unique = true)
})
public class AccessRequest extends Auditable {
    @Id
    private String id;

    private String mindmapId;
    private String userId; // Người xin quyền
    
    private Permission requestedPermission; // EDITOR hoặc VIEWER
    
    // Thông tin phụ để hiển thị nhanh trên FE mà không cần join bảng User
    private String requesterEmail;
    private String requesterName;
    private String requesterAvatar;

    // Constructors
    public AccessRequest() {}

    // Manual Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMindmapId() { return mindmapId; }
    public void setMindmapId(String mindmapId) { this.mindmapId = mindmapId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Permission getRequestedPermission() { return requestedPermission; }
    public void setRequestedPermission(Permission requestedPermission) { this.requestedPermission = requestedPermission; }

    public String getRequesterEmail() { return requesterEmail; }
    public void setRequesterEmail(String requesterEmail) { this.requesterEmail = requesterEmail; }

    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getRequesterAvatar() { return requesterAvatar; }
    public void setRequesterAvatar(String requesterAvatar) { this.requesterAvatar = requesterAvatar; }
}