package com.example.mindmap.features.collaboration;

import com.example.mindmap.core.model.Auditable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
}