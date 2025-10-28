// src/main/java/com/example/mindmap/features/mindmap/MindmapService.java
package com.example.mindmap.features.mindmap;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.core.exception.AccessDeniedException;
import com.example.mindmap.core.exception.ResourceNotFoundException;
import com.example.mindmap.features.collaboration.Collaboration;
import com.example.mindmap.features.collaboration.CollaborationRepository;
import com.example.mindmap.features.collaboration.Permission;
import com.example.mindmap.features.collaboration.dto.CollaboratorResponse;
import com.example.mindmap.features.mindmap.content.MindmapContent;
import com.example.mindmap.features.mindmap.content.NodeData;
import com.example.mindmap.features.mindmap.dto.MindmapCreateRequest;
import com.example.mindmap.features.mindmap.dto.MindmapDetailResponse;
import com.example.mindmap.features.mindmap.dto.MindmapSummaryResponse;
import com.example.mindmap.features.mindmap.dto.MindmapUpdateRequest;
import com.example.mindmap.features.user.User;
import com.example.mindmap.features.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class MindmapService {

    // (Các dependencies không đổi)
    private final MindmapRepository mindmapRepository;
    private final CollaborationRepository collaborationRepository;
    private final UserRepository userRepository;
    private final AuthUtils authUtils;

    public MindmapService(MindmapRepository mindmapRepository, CollaborationRepository collaborationRepository, UserRepository userRepository, AuthUtils authUtils) {
        this.mindmapRepository = mindmapRepository;
        this.collaborationRepository = collaborationRepository;
        this.userRepository = userRepository;
        this.authUtils = authUtils;
    }

    // (listForCurrentUser không đổi)
    @Transactional(readOnly = true)
    public List<MindmapSummaryResponse> listForCurrentUser() {
        String userId = authUtils.getRequiredCurrentUserId();
        List<Mindmap> owned = mindmapRepository.findByOwnerIdOrderByUpdatedAtDesc(userId);
        List<String> collaboratedMapIds = collaborationRepository.findByUserId(userId).stream()
                .map(Collaboration::getMindmapId)
                .collect(Collectors.toList());
        List<Mindmap> collaborated = mindmapRepository.findByIdInOrderByUpdatedAtDesc(collaboratedMapIds);

        return Stream.concat(owned.stream(), collaborated.stream())
                .distinct()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    // (getMindmapForCurrentUser không đổi)
    @Transactional(readOnly = true)
    public MindmapDetailResponse getMindmapForCurrentUser(String id) {
        String userId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = findMindmapById(id);
        checkViewPermission(userId, mindmap);
        return toDetailResponse(mindmap);
    }
    
    // (createMindmap không đổi, nhưng nó gọi createDefaultContent() đã được sửa)
    @Transactional
    public MindmapDetailResponse createMindmap(MindmapCreateRequest request) {
        String userId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = new Mindmap();
        mindmap.setName(request.name());
        mindmap.setOwnerId(userId);
        mindmap.setLastEditedBy(userId);
        mindmap.setContent(createDefaultContent()); // Gọi hàm đã sửa
        Mindmap savedMindmap = mindmapRepository.save(mindmap);
        return toDetailResponse(savedMindmap);
    }

    // (updateMindmap không đổi)
    // LƯU Ý: Như bạn phân tích, logic "hybrid" (List <-> Map)
    // sẽ hữu ích nhất khi xử lý *partial updates* (ví dụ: qua WebSocket).
    // Với endpoint PUT/REST này (thay thế toàn bộ content),
    // việc FE gửi lên List<NodeData> (đã sửa) là chính xác.
    @Transactional
    public MindmapDetailResponse updateMindmap(String id, MindmapUpdateRequest request) {
        String userId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = findMindmapById(id);
        checkEditPermission(userId, mindmap);

        if (request.name() != null && !request.name().isBlank()) {
            mindmap.setName(request.name().trim());
        }
        if (request.content() != null) {
            mindmap.setContent(request.content());
        }
        mindmap.setLastEditedBy(userId);
        // Lưu ý: @Version (version) và @LastModifiedDate (updatedAt)
        // sẽ được Spring Data MongoDB tự động cập nhật khi save.
        Mindmap updatedMindmap = mindmapRepository.save(mindmap);
        return toDetailResponse(updatedMindmap);
    }
    
    // (deleteMindmap không đổi)
    @Transactional
    public void deleteMindmap(String id) {
        String userId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = findMindmapById(id);
        if (!mindmap.getOwnerId().equals(userId)) {
            throw new AccessDeniedException("mindmap", "delete");
        }
        collaborationRepository.deleteByMindmapId(id);
        mindmapRepository.deleteById(id);
    }
    
    // (findMindmapById không đổi)
    public Mindmap findMindmapById(String id) {
        return mindmapRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mindmap", "id", id));
    }
    
    // (checkViewPermission không đổi)
    public void checkViewPermission(String userId, Mindmap mindmap) {
        if (mindmap.getOwnerId().equals(userId)) return;
        if (mindmap.getAccessSettings().isPublic() && mindmap.getAccessSettings().getPublicAccessLevel() == Mindmap.PublicAccessLevel.VIEW) return;
        if (collaborationRepository.existsByMindmapIdAndUserId(mindmap.getId(), userId)) return;
        throw new AccessDeniedException("mindmap", "view");
    }

    // (checkEditPermission không đổi)
    public void checkEditPermission(String userId, Mindmap mindmap) {
        if (mindmap.getOwnerId().equals(userId)) return;
        collaborationRepository.findByMindmapIdAndUserId(mindmap.getId(), userId)
                .filter(c -> c.getPermission() == Permission.EDITOR)
                .orElseThrow(() -> new AccessDeniedException("mindmap", "edit"));
    }

    // SỬA LỖI (Vấn đề #5): Cập nhật hàm này
    private MindmapContent createDefaultContent() {
        MindmapContent content = new MindmapContent();
        NodeData root = new NodeData();

        root.setId("root"); // Gán ID cho node root
        root.setText("Chủ đề chính");
        root.setX(0);
        root.setY(0);
        // Đổi từ Map.of("root", root) thành List
        content.setNodes(Collections.singletonList(root));
        content.setEdges(Collections.emptyList());
        return content;
    }

    // (toSummaryResponse không đổi)
    private MindmapSummaryResponse toSummaryResponse(Mindmap mindmap) {
        return new MindmapSummaryResponse(mindmap.getId(), mindmap.getName(), mindmap.getOwnerId(), mindmap.getUpdatedAt(), mindmap.getTags(), mindmap.getAccessSettings());
    }

    // SỬA LỖI (Vấn đề #6): Cập nhật hàm này
    private MindmapDetailResponse toDetailResponse(Mindmap mindmap) {
        // ... (logic lấy collaborators giữ nguyên) ...
        List<Collaboration> collaborations = collaborationRepository.findByMindmapId(mindmap.getId());
        List<String> userIds = collaborations.stream().map(Collaboration::getUserId).collect(Collectors.toList());
        userIds.add(mindmap.getOwnerId());
        
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        
        User owner = userMap.get(mindmap.getOwnerId());
        List<CollaboratorResponse> collaboratorResponses = collaborations.stream()
                .map(c -> {
                    User user = userMap.get(c.getUserId());
                    // Kiểm tra null an toàn
                    if (user == null) return null;
                    return new CollaboratorResponse(user.getId(), user.getDisplayName(), user.getAvatarUrl(), c.getPermission());
                })
                .filter(java.util.Objects::nonNull) // Lọc bỏ user không tìm thấy
                .collect(Collectors.toList());
        
        if (owner != null) {
            collaboratorResponses.add(0, new CollaboratorResponse(owner.getId(), owner.getDisplayName(), owner.getAvatarUrl(), Permission.OWNER));
        }

        // Ánh xạ 4 trường mới vào constructor
        return new MindmapDetailResponse(
                mindmap.getId(),
                mindmap.getName(),
                mindmap.getOwnerId(),
                mindmap.getContent(),
                mindmap.getUpdatedAt(),
                mindmap.getTags(),
                mindmap.getAccessSettings(),
                collaboratorResponses,
                // 4 trường đã thêm:
                mindmap.getWorkspaceId(),
                mindmap.getLastEditedBy(),
                mindmap.getCreatedAt(),
                mindmap.getVersion()
        );
    }
}
