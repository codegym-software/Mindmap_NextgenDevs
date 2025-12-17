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
import com.example.mindmap.features.mindmap.content.NodeStyle;
import com.example.mindmap.features.mindmap.dto.MindmapDetailResponse;
import com.example.mindmap.features.mindmap.dto.MindmapSummaryResponse;
import com.example.mindmap.features.mindmap.dto.MindmapSyncRequest;
import com.example.mindmap.features.mindmap.dto.MindmapUpdateRequest;
import com.example.mindmap.features.user.User;
import com.example.mindmap.features.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class MindmapService {

    private static final Logger log = LoggerFactory.getLogger(MindmapService.class);

    private final MindmapRepository mindmapRepository;
    private final CollaborationRepository collaborationRepository;
    private final UserRepository userRepository;
    private final AuthUtils authUtils;
    
    private static final String ROOT_NODE_ID = "root";

    public MindmapService(MindmapRepository mindmapRepository, CollaborationRepository collaborationRepository, UserRepository userRepository, AuthUtils authUtils) {
        this.mindmapRepository = mindmapRepository;
        this.collaborationRepository = collaborationRepository;
        this.userRepository = userRepository;
        this.authUtils = authUtils;
    }

    // ===================================================================
    // MAIN API METHODS
    // ===================================================================

    @Transactional(readOnly = true)
    public MindmapDetailResponse getMindmapForCurrentUser(String id) {
        String userId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = findMindmapById(id);
        checkViewPermission(userId, mindmap);
        return toDetailResponse(mindmap);
    }

    /**
     * Kiểm tra quyền xem (VIEW):
     * 1. Là Owner
     * 2. Mindmap Public (chế độ VIEW)
     * 3. Là Collaborator ĐÃ ĐƯỢC CHẤP NHẬN (ACTIVE)
     */
    public void checkViewPermission(String userId, Mindmap mindmap) {
        if (mindmap.getOwnerId().equals(userId)) return;
        
        if (mindmap.getAccessSettings().isPublic() && mindmap.getAccessSettings().getPublicAccessLevel() == Mindmap.PublicAccessLevel.VIEW) return;
        
        // [QUAN TRỌNG] Phải check cả status ACCEPTED
        boolean hasActiveCollab = collaborationRepository.existsByMindmapIdAndUserIdAndStatus(
                mindmap.getId(), 
                userId, 
                Collaboration.InviteStatus.ACCEPTED
        );
        
        if (hasActiveCollab) return;

        throw new AccessDeniedException("mindmap", "view");
    }

    /**
     * Kiểm tra quyền sửa (EDIT):
     * 1. Là Owner
     * 2. Là Collaborator ĐÃ ĐƯỢC CHẤP NHẬN (ACTIVE) + Quyền EDITOR
     */
    public void checkEditPermission(String userId, Mindmap mindmap) {
        if (mindmap.getOwnerId().equals(userId)) return;
        
        collaborationRepository.findByMindmapIdAndUserId(mindmap.getId(), userId)
                .filter(c -> c.getStatus() == Collaboration.InviteStatus.ACCEPTED) // Phải Active
                .filter(c -> c.getPermission() == Permission.EDITOR)               // Phải là Editor
                .orElseThrow(() -> new AccessDeniedException("mindmap", "edit"));
    }

    // ===================================================================
    // CRUD OPERATIONS
    // ===================================================================

    @Transactional
    public MindmapDetailResponse createMindmap(MindmapUpdateRequest request) {
        String userId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = new Mindmap();
        mindmap.setName(request.name());
        mindmap.setOwnerId(userId);
        mindmap.setLastEditedBy(userId);

        if (request.content() != null && request.content().getNodes() != null && !request.content().getNodes().isEmpty()) {
            mindmap.setContent(request.content());
        } else {
            mindmap.setContent(createDefaultContent());
        }

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
            newContent.setLayoutMode(originalContent.getLayoutMode());
            if (originalContent.getNodes() != null) {
                List<NodeData> newNodes = originalContent.getNodes().stream()
                        .map(this::deepCopyNodeData)
                        .collect(Collectors.toList());
                newContent.setNodes(newNodes);
            }
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
    public List<MindmapSummaryResponse> listForCurrentUser(String search) {
        String userId = authUtils.getRequiredCurrentUserId();
        List<Mindmap> owned = mindmapRepository.findByOwnerIdOrderByUpdatedAtDesc(userId);
        
        // Lấy các mindmap được chia sẻ (chỉ tính những cái đã ACCEPTED)
        List<String> collaboratedMapIds = collaborationRepository.findByUserId(userId).stream()
                .filter(c -> c.getStatus() == Collaboration.InviteStatus.ACCEPTED) // [FIX] Chỉ hiện map đã active
                .map(Collaboration::getMindmapId)
                .collect(Collectors.toList());
                
        List<Mindmap> collaborated = mindmapRepository.findByIdInOrderByUpdatedAtDesc(collaboratedMapIds);

        return Stream.concat(owned.stream(), collaborated.stream())
                .distinct()
                .filter(mindmap -> !StringUtils.hasText(search) || 
                        mindmap.getName().toLowerCase().contains(search.toLowerCase()))
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public String exportMindmapAsText(String id) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = findMindmapById(id);
        checkViewPermission(currentUserId, mindmap);
        
        MindmapContent content = mindmap.getContent();
        if (content == null || content.getNodes() == null || content.getNodes().isEmpty()) {
            return mindmap.getName();
        }
        
        Map<String, List<String>> childrenMap = new HashMap<>();
        if (content.getEdges() != null) {
            for (EdgeData edge : content.getEdges()) {
                childrenMap.computeIfAbsent(edge.getFrom(), k -> new ArrayList<>()).add(edge.getTo());
            }
        }
        
        Map<String, NodeData> nodesMap = content.getNodes().stream()
                .collect(Collectors.toMap(NodeData::getId, Function.identity()));
        
        if (!nodesMap.containsKey(ROOT_NODE_ID)) {
             return mindmap.getName() + "\n(Error: Root node not found)";
        }

        StringBuilder sb = new StringBuilder();
        sb.append(mindmap.getName()).append("\n");
        buildTextTreeRecursive(ROOT_NODE_ID, nodesMap, childrenMap, sb, 0);
        
        return sb.toString();
    }

    @Transactional
    public List<MindmapSummaryResponse> syncGuestMindmaps(List<MindmapSyncRequest> requests) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        List<Mindmap> newMindmaps = new ArrayList<>();
        
        for (MindmapSyncRequest request : requests) {
            Mindmap mindmap = new Mindmap();
            mindmap.setName(request.name());
            mindmap.setOwnerId(currentUserId);
            mindmap.setLastEditedBy(currentUserId);
            mindmap.setContent(request.content());
            try {
                Instant guestCreatedAt = Instant.parse(request.createdAt());
                mindmap.setCreatedAt(guestCreatedAt);
            } catch (Exception e) {
                log.warn("Invalid guest createdAt format '{}'. Defaulting to now.", request.createdAt());
            }
            newMindmaps.add(mindmap);
        }
        
        List<Mindmap> savedMindmaps = mindmapRepository.saveAll(newMindmaps);
        return savedMindmaps.stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    // ===================================================================
    // HELPER METHODS
    // ===================================================================

    public Mindmap findMindmapById(String id) {
        return mindmapRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Mindmap", "id", id));
    }

    private MindmapContent createDefaultContent() {
        MindmapContent content = new MindmapContent();
        NodeData root = new NodeData();
        root.setId(ROOT_NODE_ID);  
        root.setText("Chủ đề chính");
        root.setX(0);
        root.setY(0);
        content.setNodes(List.of(root));  
        content.setEdges(Collections.emptyList());
        content.setLayoutMode("FREEFORM");
        return content;
    }

    private MindmapSummaryResponse toSummaryResponse(Mindmap mindmap) {
        return new MindmapSummaryResponse(mindmap.getId(), mindmap.getName(), mindmap.getOwnerId(), mindmap.getCreatedAt(), mindmap.getUpdatedAt(), mindmap.getTags(), mindmap.getAccessSettings());
    }

    private MindmapDetailResponse toDetailResponse(Mindmap mindmap) {
        // Lấy danh sách collaborator (chỉ ACTIVE mới trả về cho client hiển thị)
        List<Collaboration> collaborations = collaborationRepository.findByMindmapId(mindmap.getId()).stream()
                .filter(c -> c.getStatus() == Collaboration.InviteStatus.ACCEPTED) // [FIX] Filter Active
                .collect(Collectors.toList());
                
        List<String> userIds = collaborations.stream().map(Collaboration::getUserId).collect(Collectors.toList());
        userIds.add(mindmap.getOwnerId());
        
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        
        User owner = userMap.get(mindmap.getOwnerId());
        List<CollaboratorResponse> collaboratorResponses = collaborations.stream()
                .map(c -> {
                    User user = userMap.get(c.getUserId());
                    if (user == null) return null;
                    return new CollaboratorResponse(user.getId(), user.getDisplayName(), user.getAvatarUrl(), c.getPermission());
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
        
        if (owner != null) {
            collaboratorResponses.add(0, new CollaboratorResponse(owner.getId(), owner.getDisplayName(), owner.getAvatarUrl(), Permission.OWNER));
        }

        return new MindmapDetailResponse(mindmap.getId(),
                mindmap.getName(),
                mindmap.getOwnerId(),
                mindmap.getContent(),
                mindmap.getUpdatedAt(),
                mindmap.getTags(),
                mindmap.getAccessSettings(),
                collaboratorResponses,
                mindmap.getWorkspaceId(),
                mindmap.getLastEditedBy(),
                mindmap.getCreatedAt(),
                mindmap.getVersion()
        );
    }

    private void buildTextTreeRecursive(String nodeId, Map<String, NodeData> nodesMap, Map<String, List<String>> childrenMap, StringBuilder sb, int depth) {
        NodeData node = nodesMap.get(nodeId);
        if (node == null) return;
        
        if (!nodeId.equals(ROOT_NODE_ID)) {
            sb.append("    ".repeat(depth - 1));
            sb.append("- ");
            sb.append(node.getText() != null ? node.getText() : "[Trống]");
            sb.append("\n");
        }
        
        List<String> childrenIds = childrenMap.getOrDefault(nodeId, Collections.emptyList());
        int nextDepth = nodeId.equals(ROOT_NODE_ID) ? 1 : depth + 1;

        for (String childId : childrenIds) {
            buildTextTreeRecursive(childId, nodesMap, childrenMap, sb, nextDepth);
        }
    }

    private NodeData deepCopyNodeData(NodeData original) {
        if (original == null) return null;
        NodeData copy = new NodeData();
        copy.setId(original.getId());
        copy.setText(original.getText());
        copy.setX(original.getX());
        copy.setY(original.getY());
        copy.setParentId(original.getParentId());
        copy.setCollapsed(original.isCollapsed());
        copy.setHyperlink(original.getHyperlink());
        copy.setNotes(original.getNotes());
        
        if (original.getStyle() != null) {
            NodeStyle originalStyle = original.getStyle();
            NodeStyle newStyle = new NodeStyle();
            
            // --- SAO CHÉP TẤT CẢ THUỘC TÍNH STYLE ---
            newStyle.setColor(originalStyle.getColor());
            newStyle.setFont(originalStyle.getFont());
            newStyle.setIsBold(originalStyle.getIsBold());
            newStyle.setIsItalic(originalStyle.getIsItalic());
            newStyle.setTextAlign(originalStyle.getTextAlign());
            newStyle.setShape(originalStyle.getShape());
            newStyle.setBorderColor(originalStyle.getBorderColor());
            newStyle.setBorderWidth(originalStyle.getBorderWidth());
            newStyle.setBorderStyle(originalStyle.getBorderStyle());
            newStyle.setImageUrl(originalStyle.getImageUrl());
            newStyle.setImageWidth(originalStyle.getImageWidth());
            newStyle.setImageHeight(originalStyle.getImageHeight());
            newStyle.setFontFamily(originalStyle.getFontFamily());
            newStyle.setFontSize(originalStyle.getFontSize());
            newStyle.setFontWeight(originalStyle.getFontWeight());
            newStyle.setFontStyle(originalStyle.getFontStyle());
            newStyle.setTextDecoration(originalStyle.getTextDecoration());
            newStyle.setTextColor(originalStyle.getTextColor());
            newStyle.setTextCase(originalStyle.getTextCase());
            newStyle.setBranchColor(originalStyle.getBranchColor());
            newStyle.setBranchLineStyle(originalStyle.getBranchLineStyle());
            newStyle.setBranchLineEnd(originalStyle.getBranchLineEnd());
            newStyle.setBranchLineThickness(originalStyle.getBranchLineThickness());
            newStyle.setQuickStyleId(originalStyle.getQuickStyleId());

            copy.setStyle(newStyle);
        } else {
            copy.setStyle(new NodeStyle());
        }
        
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