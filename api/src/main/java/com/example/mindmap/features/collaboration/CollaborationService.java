// src/main/java/com/example/mindmap/features/collaboration/CollaborationService.java
package com.example.mindmap.features.collaboration;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.core.exception.AccessDeniedException;
import com.example.mindmap.core.exception.ResourceNotFoundException;
import com.example.mindmap.features.collaboration.dto.CollaboratorResponse;
import com.example.mindmap.features.collaboration.dto.InviteRequest;
import com.example.mindmap.features.mindmap.Mindmap;
import com.example.mindmap.features.mindmap.MindmapService;
import com.example.mindmap.features.user.User;
import com.example.mindmap.features.user.UserRepository;
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
    private final UserRepository userRepository;
    private final AuthUtils authUtils;

    public CollaborationService(CollaborationRepository collaborationRepository, MindmapService mindmapService, UserRepository userRepository, AuthUtils authUtils) {
        this.collaborationRepository = collaborationRepository;
        this.mindmapService = mindmapService;
        this.userRepository = userRepository;
        this.authUtils = authUtils;
    }

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
        mindmapService.checkViewPermission(currentUserId, mindmap);

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