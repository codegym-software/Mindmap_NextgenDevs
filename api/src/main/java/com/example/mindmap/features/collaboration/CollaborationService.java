// src/main/java/com/example/mindmap/features/collaboration/CollaborationService.java
package com.example.mindmap.features.collaboration;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.core.exception.AccessDeniedException;
import com.example.mindmap.core.exception.ResourceNotFoundException;
import com.example.mindmap.features.collaboration.dto.*; // Import all
import com.example.mindmap.features.mindmap.Mindmap;
import com.example.mindmap.features.mindmap.MindmapRepository; // Thêm MindmapRepository
import com.example.mindmap.features.mindmap.MindmapService;
import com.example.mindmap.features.user.User;
import com.example.mindmap.features.user.UserRepository;
import org.springframework.beans.factory.annotation.Value; // Thêm Value
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CollaborationService {

    private final CollaborationRepository collaborationRepository;
    private final MindmapService mindmapService;
    private final MindmapRepository mindmapRepository; // Thêm
    private final UserRepository userRepository;
    private final AuthUtils authUtils;
    
    @Value("${app.frontend-base-url:http://localhost:3000}") // Thêm base URL
    private String frontendBaseUrl;


    public CollaborationService(CollaborationRepository collaborationRepository,
                                MindmapService mindmapService,
                                MindmapRepository mindmapRepository, // Thêm
                                UserRepository userRepository,
                                AuthUtils authUtils) {
        this.collaborationRepository = collaborationRepository;
        this.mindmapService = mindmapService;
        this.mindmapRepository = mindmapRepository; // Thêm
        this.userRepository = userRepository;
        this.authUtils = authUtils;
    }
    
    // --- Logic cho Endpoint mới (Giai đoạn 1) ---

    @Transactional
    public ShareSettingsResponse updatePublicShareSettings(String mindmapId, ShareSettingsRequest request) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        // Chỉ chủ sở hữu mới được thay đổi cài đặt chia sẻ
        if (!mindmap.getOwnerId().equals(currentUserId)) {
            throw new AccessDeniedException("Only the mindmap owner can change share settings.");
        }

        Mindmap.AccessSettings settings = mindmap.getAccessSettings();
        settings.setPublic(request.isPublic());
        
        // Nếu tắt public, luôn set là DISABLED
        if (!request.isPublic()) {
            settings.setPublicAccessLevel(Mindmap.PublicAccessLevel.DISABLED);
        } else {
            // Nếu bật public, dùng quyền từ request (VIEW)
            if(request.publicAccessLevel() == Mindmap.PublicAccessLevel.DISABLED) {
                 // Không cho phép set (isPublic=true, level=DISABLED)
                 throw new IllegalArgumentException("Cannot set public access to DISABLED when isPublic is true.");
            }
            settings.setPublicAccessLevel(request.publicAccessLevel());
        }

        mindmap.setAccessSettings(settings);
        Mindmap savedMindmap = mindmapRepository.save(mindmap);
        
        return ShareSettingsResponse.fromMindmap(savedMindmap, frontendBaseUrl);
    }
    
    @Transactional
    public CollaboratorResponse updateCollaboratorPermission(String mindmapId, String collaboratorId, PermissionUpdateRequest request) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);
        
        // Chỉ chủ sở hữu mới được thay đổi quyền
        if (!mindmap.getOwnerId().equals(currentUserId)) {
            throw new AccessDeniedException("Only the mindmap owner can change permissions.");
        }
        
        // Không cho phép gán quyền OWNER
        if (request.permission() == Permission.OWNER) {
            throw new IllegalArgumentException("Cannot assign OWNER permission.");
        }
        
        // Không cho phép tự thay đổi quyền của mình
        if (collaboratorId.equals(currentUserId)) {
            throw new IllegalArgumentException("Owner cannot change their own permissions.");
        }
        
        Collaboration collaboration = collaborationRepository.findByMindmapIdAndUserId(mindmapId, collaboratorId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration", "user_id", collaboratorId));
        
        collaboration.setPermission(request.permission());
        collaborationRepository.save(collaboration);
        
        User user = userRepository.findById(collaboratorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", collaboratorId));
                
        return new CollaboratorResponse(user.getId(), user.getDisplayName(), user.getAvatarUrl(), collaboration.getPermission());
    }

    // --- Logic đã có ---

    @Transactional
    public CollaboratorResponse addCollaborator(String mindmapId, InviteRequest request) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        if (!mindmap.getOwnerId().equals(currentUserId)) {
            throw new AccessDeniedException("Only the mindmap owner can add collaborators.");
        }
        if (request.permission() == Permission.OWNER) {
             throw new IllegalArgumentException("Cannot assign OWNER permission.");
        }

        User userToInvite = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.email()));

        if (userToInvite.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Cannot invite yourself.");
        }
        
        Collaboration collaboration = collaborationRepository.findByMindmapIdAndUserId(mindmapId, userToInvite.getId())
                .orElse(new Collaboration());

        collaboration.setMindmapId(mindmapId);
        collaboration.setUserId(userToInvite.getId());
        collaboration.setPermission(request.permission());
        collaboration.setStatus(Collaboration.InviteStatus.ACCEPTED); // Direct add
        collaboration.setInvitedBy(currentUserId);
        
        collaborationRepository.save(collaboration);

        return new CollaboratorResponse(userToInvite.getId(), userToInvite.getDisplayName(), userToInvite.getAvatarUrl(), request.permission());
    }

    @Transactional
    public void removeCollaborator(String mindmapId, String collaboratorId) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        if (!mindmap.getOwnerId().equals(currentUserId)) {
            throw new AccessDeniedException("Only the mindmap owner can remove collaborators.");
        }
        if (collaboratorId.equals(currentUserId)) {
            throw new IllegalArgumentException("Owner cannot remove themselves.");
        }

        Collaboration collaboration = collaborationRepository.findByMindmapIdAndUserId(mindmapId, collaboratorId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration", "user_id", collaboratorId));
        
        collaborationRepository.delete(collaboration);
    }
    
    @Transactional(readOnly = true)
    public List<CollaboratorResponse> getCollaborators(String mindmapId) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);
        mindmapService.checkViewPermission(currentUserId, mindmap); // Đảm bảo user có quyền xem list này

        List<Collaboration> collaborations = collaborationRepository.findByMindmapId(mindmapId);
        List<String> userIds = collaborations.stream().map(Collaboration::getUserId).collect(Collectors.toList());
        
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        
        return collaborations.stream()
                .map(c -> {
                    User user = userMap.get(c.getUserId());
                    if (user == null) return null;
                    return new CollaboratorResponse(user.getId(), user.getDisplayName(), user.getAvatarUrl(), c.getPermission());
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }
}
