package com.example.mindmap.features.collaboration;

import com.example.mindmap.core.model.Auditable;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder // Thêm Builder pattern để dễ khởi tạo object
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Document(collection = "collaborators")
// ✅ CẤU HÌNH INDEXING TRỰC TIẾP TẠI ĐÂY
@CompoundIndexes({
        // 1. Đảm bảo tính duy nhất: 1 User chỉ có 1 quyền trong 1 Mindmap
        @CompoundIndex(name = "mindmap_user_unique", def = "{'mindmapId': 1, 'userId': 1}", unique = true),
        
        // 2. Tối ưu Query: Tìm danh sách request đang chờ (PENDING) của 1 Mindmap
        @CompoundIndex(name = "mindmap_status_idx", def = "{'mindmapId': 1, 'status': 1}"),
        
        // 3. Tối ưu Query: Tìm danh sách các Mindmap mà User này đang tham gia hoặc đang xin vào
        @CompoundIndex(name = "user_status_idx", def = "{'userId': 1, 'status': 1}")
})
public class Collaboration extends Auditable {
    @Id
    private String id;

    private String mindmapId;
    private String userId;

    private Permission permission; // Quyền hiện tại (nếu ACTIVE) hoặc quyền dự kiến (nếu PENDING)

    @Builder.Default
    private InviteStatus status = InviteStatus.PENDING;

    // --- CÁC TRƯỜNG BỔ SUNG CHO LOGIC REQUEST ACCESS & INVITE ---

    // Phân loại: Được mời (INVITE) hay Tự xin vào (REQUEST_ACCESS)
    private InviteType type;

    // Nếu là xin quyền, người dùng muốn quyền gì? (Thường là VIEWER hoặc EDITOR)
    private Permission requestedPermission;

    // Ai là người mời (nếu type = INVITE) -> Lưu userId của Owner/Editor mời
    private String invitedBy;

    // Ai là người duyệt/từ chối (nếu type = REQUEST_ACCESS) -> Lưu userId của Owner
    private String decidedBy;
    
    // Thời điểm duyệt/từ chối
    private Instant decidedAt;

    public enum InviteStatus {
        PENDING,  // Đang chờ duyệt (Request) hoặc Chờ chấp nhận (Invite)
        ACCEPTED, // Đã tham gia
        REJECTED  // Đã bị từ chối
    }

    public enum InviteType {
        INVITE,         // Owner chủ động mời qua email
        REQUEST_ACCESS  // User click link và bấm "Request Access"
    }
}
