// src/main/java/com/example/mindmap/features/mindmap/MindmapService.java
package com.example.mindmap.features.mindmap;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.core.exception.AccessDeniedException;
import com.example.mindmap.core.exception.ResourceNotFoundException;
import com.example.mindmap.features.collaboration.Collaboration;
import com.example.mindmap.features.collaboration.CollaborationRepository;
import com.example.mindmap.features.collaboration.Permission;
import com.example.mindmap.features.collaboration.dto.CollaboratorResponse;
import com.example.mindmap.features.mindmap.content.EdgeData;
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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function; // Thêm
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.util.StringUtils; // [NEW] Import để hỗ trợ tìm kiếm

@Service
public class MindmapService {

     private final MindmapRepository mindmapRepository;
     private final CollaborationRepository collaborationRepository;
     private final UserRepository userRepository;
     private final AuthUtils authUtils;
     
     // ID của node gốc luôn là "root"
     private static final String ROOT_NODE_ID = "root";

     public MindmapService(MindmapRepository mindmapRepository, CollaborationRepository collaborationRepository, UserRepository userRepository, AuthUtils authUtils) {
         this.mindmapRepository = mindmapRepository;
         this.collaborationRepository = collaborationRepository;
         this.userRepository = userRepository;
         this.authUtils = authUtils;
     }
     
     // --- Logic cho Endpoint (Giai đoạn 1) ---

     @Transactional
     public MindmapDetailResponse duplicateMindmap(String originalMindmapId) {
         String currentUserId = authUtils.getRequiredCurrentUserId();
         Mindmap originalMindmap = findMindmapById(originalMindmapId);
         checkViewPermission(currentUserId, originalMindmap);
         
         Mindmap newMindmap = new Mindmap();
         newMindmap.setName("Copy of " + originalMindmap.getName());
         newMindmap.setOwnerId(currentUserId);
         newMindmap.setLastEditedBy(currentUserId);
         
         MindmapContent originalContent = originalMindmap.getContent();
         if (originalContent != null) {
             MindmapContent newContent = new MindmapContent();

             // [NEW] Sao chép layoutMode
             newContent.setLayoutMode(originalContent.getLayoutMode());
             
             // SỬA LỖI: Deep copy List<NodeData> (thay vì Map)
             if (originalContent.getNodes() != null) {
                 List<NodeData> newNodes = originalContent.getNodes().stream()
                         .map(this::deepCopyNodeData) // Gọi hàm deep copy cho từng node
                         .collect(Collectors.toList());
                 newContent.setNodes(newNodes);
             }
             
             // Deep copy edges (List<EdgeData>)
             if (originalContent.getEdges() != null) {
                 List<EdgeData> newEdges = originalContent.getEdges().stream()
                         .map(this::deepCopyEdgeData)
                         .collect(Collectors.toList());
                 newContent.setEdges(newEdges);
             }
             newMindmap.setContent(newContent);
         } else {
              newMindmap.setContent(createDefaultContent());
         }
         
         Mindmap savedMindmap = mindmapRepository.save(newMindmap);
         return toDetailResponse(savedMindmap);
     }
     
     @Transactional(readOnly = true)
     public String exportMindmapAsText(String id) {
         String currentUserId = authUtils.getRequiredCurrentUserId();
         Mindmap mindmap = findMindmapById(id);
         checkViewPermission(currentUserId, mindmap);
         
         MindmapContent content = mindmap.getContent();
         // SỬA LỖI: Kiểm tra content.getNodes() (List)
         if (content == null || content.getNodes() == null || content.getNodes().isEmpty()) {
             return mindmap.getName();
         }
         
         // --- Logic Hybrid (Bắt buộc) ---
         // 1. Chuyển List<EdgeData> thành Map (Adjacency List)
         Map<String, List<String>> childrenMap = new HashMap<>();
         if (content.getEdges() != null) {
             for (EdgeData edge : content.getEdges()) {
                 childrenMap.computeIfAbsent(edge.getFrom(), k -> new ArrayList<>()).add(edge.getTo());
             }
         }
         
         // 2. SỬA LỖI: Chuyển List<NodeData> -> Map<String, NodeData> để tra cứu O(1)
         Map<String, NodeData> nodesMap = content.getNodes().stream()
                 .collect(Collectors.toMap(NodeData::getId, Function.identity()));
         
         // 3. Kiểm tra xem node 'root' có tồn tại trong Map không
         if (!nodesMap.containsKey(ROOT_NODE_ID)) {
              return mindmap.getName() + "\n(Error: Root node not found)"; // Không tìm thấy gốc
         }

         // 4. Xây dựng cây text (logic đệ quy này vẫn đúng)
         StringBuilder sb = new StringBuilder();
         sb.append(mindmap.getName()).append("\n"); // Thêm tên mindmap làm dòng đầu
         buildTextTreeRecursive(ROOT_NODE_ID, nodesMap, childrenMap, sb, 0);
         
         return sb.toString();
     }
     
     // Hàm đệ quy (Logic này chính xác, không cần sửa)
     private void buildTextTreeRecursive(String nodeId, Map<String, NodeData> nodesMap, Map<String, List<String>> childrenMap, StringBuilder sb, int depth) {
         NodeData node = nodesMap.get(nodeId);
         if (node == null) return;
         
         // Bỏ qua in node 'root' vì đã in tên mindmap
         if (!nodeId.equals(ROOT_NODE_ID)) {
             sb.append("    ".repeat(depth - 1)); // Lùi 1 cấp
             sb.append("- ");
             sb.append(node.getText() != null ? node.getText() : "[Trống]");
             sb.append("\n");
         }
         
         List<String> childrenIds = childrenMap.getOrDefault(nodeId, Collections.emptyList());
         int nextDepth = nodeId.equals(ROOT_NODE_ID) ? 1 : depth + 1; // Bắt đầu depth 1 cho con của root

         for (String childId : childrenIds) {
             buildTextTreeRecursive(childId, nodesMap, childrenMap, sb, nextDepth);
         }
     }


     // --- Logic CRUD (Cập nhật cho List<NodeData>) ---
     
     @Transactional(readOnly = true)
     // [UPDATE] Thêm tham số `search`
     public List<MindmapSummaryResponse> listForCurrentUser(String search) {
         String userId = authUtils.getRequiredCurrentUserId();
         List<Mindmap> owned = mindmapRepository.findByOwnerIdOrderByUpdatedAtDesc(userId);
         List<String> collaboratedMapIds = collaborationRepository.findByUserId(userId).stream()
                 .map(Collaboration::getMindmapId)
                 .collect(Collectors.toList());
         List<Mindmap> collaborated = mindmapRepository.findByIdInOrderByUpdatedAtDesc(collaboratedMapIds);

         // [UPDATE] Thêm logic filter bằng stream
         // Lọc trong bộ nhớ (in-memory) sau khi lấy từ DB
         return Stream.concat(owned.stream(), collaborated.stream())
                 .distinct()
                 // Thêm bước filter:
                 .filter(mindmap -> !StringUtils.hasText(search) || 
                         mindmap.getName().toLowerCase().contains(search.toLowerCase()))
                 .map(this::toSummaryResponse)
                 .collect(Collectors.toList());
     }

     @Transactional(readOnly = true)
     public MindmapDetailResponse getMindmapForCurrentUser(String id) {
         String userId = authUtils.getRequiredCurrentUserId();
         Mindmap mindmap = findMindmapById(id);
         checkViewPermission(userId, mindmap);
         return toDetailResponse(mindmap);
     }
     
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

     @Transactional
     public MindmapDetailResponse updateMindmap(String id, MindmapUpdateRequest request) {
         String userId = authUtils.getRequiredCurrentUserId();
         Mindmap mindmap = findMindmapById(id);
         checkEditPermission(userId, mindmap);

         if (request.name() != null && !request.name().isBlank()) {
             mindmap.setName(request.name().trim());
         }
         if (request.content() != null) {
             // SỬA LỖI: Cần validate content mới (ví dụ: đảm bảo có ID)
             // Tạm thời chấp nhận
             mindmap.setContent(request.content());
         }
         mindmap.setLastEditedBy(userId);
         Mindmap updatedMindmap = mindmapRepository.save(mindmap);
         return toDetailResponse(updatedMindmap);
     }
     
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
     
     // --- Hàm Helper (Không thay đổi) ---

     public Mindmap findMindmapById(String id) {
         return mindmapRepository.findById(id)
             .orElseThrow(() -> new ResourceNotFoundException("Mindmap", "id", id));
     }
     
     public void checkViewPermission(String userId, Mindmap mindmap) {
         if (mindmap.getOwnerId().equals(userId)) return;
         if (mindmap.getAccessSettings().isPublic() && mindmap.getAccessSettings().getPublicAccessLevel() == Mindmap.PublicAccessLevel.VIEW) return;
         if (collaborationRepository.existsByMindmapIdAndUserId(mindmap.getId(), userId)) return;
         throw new AccessDeniedException("mindmap", "view");
     }

     public void checkEditPermission(String userId, Mindmap mindmap) {
         if (mindmap.getOwnerId().equals(userId)) return;
         collaborationRepository.findByMindmapIdAndUserId(mindmap.getId(), userId)
                 .filter(c -> c.getPermission() == Permission.EDITOR)
                 .orElseThrow(() -> new AccessDeniedException("mindmap", "edit"));
     }
     
     // --- Helper functions (Sửa lỗi + Cập nhật) ---

     private MindmapContent createDefaultContent() {
         MindmapContent content = new MindmapContent();
         NodeData root = new NodeData();
         
         // SỬA LỖI: Thêm ID cho NodeData
         root.setId(ROOT_NODE_ID);  
         root.setText("Chủ đề chính");
         root.setX(0); // Tọa độ ban đầu (FE có thể tự căn giữa)
         root.setY(0);
         
         // SỬA LỖI: Đưa vào List thay vì Map
         content.setNodes(List.of(root));  
         content.setEdges(Collections.emptyList());
         // [NEW] Đặt layout mặc định khi tạo mới
         content.setLayoutMode("FREEFORM");
         return content;
     }

     private MindmapSummaryResponse toSummaryResponse(Mindmap mindmap) {
         // Hàm này không bị ảnh hưởng, vì nó không đọc content
         return new MindmapSummaryResponse(mindmap.getId(), mindmap.getName(), mindmap.getOwnerId(), mindmap.getUpdatedAt(), mindmap.getTags(), mindmap.getAccessSettings());
     }

     private MindmapDetailResponse toDetailResponse(Mindmap mindmap) {
         // Hàm này không bị ảnh hưởng, vì nó chỉ truyền object MindmapContent đi
         List<Collaboration> collaborations = collaborationRepository.findByMindmapId(mindmap.getId());
         List<String> userIds = collaborations.stream().map(Collaboration::getUserId).collect(Collectors.toList());
         userIds.add(mindmap.getOwnerId());
         
         Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                 .collect(Collectors.toMap(User::getId, Function.identity()));
         
         User owner = userMap.get(mindmap.getOwnerId());
         List<CollaboratorResponse> collaboratorResponses = collaborations.stream()
                 .map(c -> {
                     User user = userMap.get(c.getUserId());
                     if (user == null) return null;
                     // Các hàm .getDisplayName(), .getAvatarUrl(), .getPermission()
                     // đều tồn tại nhờ @Data trên model mới.
                     return new CollaboratorResponse(user.getId(), user.getDisplayName(), user.getAvatarUrl(), c.getPermission());
                 })
                 .filter(java.util.Objects::nonNull)
                 .collect(Collectors.toList());
         
         if (owner != null) {
             collaboratorResponses.add(0, new CollaboratorResponse(owner.getId(), owner.getDisplayName(), owner.getAvatarUrl(), Permission.OWNER));
         }

         // .getContent() trả về MindmapContent (với List<NodeData>)
         return new MindmapDetailResponse(mindmap.getId(),
                 mindmap.getName(),
                 mindmap.getOwnerId(),
                 mindmap.getContent(),
                 mindmap.getUpdatedAt(),
                 mindmap.getTags(),
                 mindmap.getAccessSettings(),
                 collaboratorResponses,
                 // 4 trường theo DTO mới
                 mindmap.getWorkspaceId(),
                 mindmap.getLastEditedBy(),
                 mindmap.getCreatedAt(),
                 mindmap.getVersion()
         );
     }
     
     // SỬA LỖI: Cập nhật deepCopyNodeData để bao gồm cả 'id'
     // [UPDATE] Cập nhật để sao chép các trường mới của NodeData
     private NodeData deepCopyNodeData(NodeData original) {
         if (original == null) return null;
         NodeData copy = new NodeData();
         copy.setId(original.getId()); // <-- Rất quan trọng
         copy.setText(original.getText());
         copy.setX(original.getX());
         copy.setY(original.getY());
         copy.setParentId(original.getParentId());
         
         // Sao chép các trường mới
         copy.setCollapsed(original.isCollapsed());
         copy.setHyperlink(original.getHyperlink());
         copy.setNotes(original.getNotes());
         
         // Sao chép style (Tạm thời là shallow copy, nếu NodeStyle phức tạp cần deep copy)
         copy.setStyle(original.getStyle());
         // Sao chép externalReference (Tạm thời shallow copy)
         copy.setExternalReference(original.getExternalReference());
         
         return copy;
     }
     
     private EdgeData deepCopyEdgeData(EdgeData original) {
         if (original == null) return null;
         EdgeData copy = new EdgeData();
         copy.setFrom(original.getFrom());
         copy.setTo(original.getTo());
         return copy;
     }
}