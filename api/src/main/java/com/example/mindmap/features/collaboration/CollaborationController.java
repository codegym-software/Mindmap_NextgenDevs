// src/main/java/com/example/mindmap/features/collaboration/CollaborationController.java
package com.example.mindmap.features.collaboration;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping; // Thêm PutMapping
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.mindmap.features.collaboration.dto.CollaboratorResponse;
import com.example.mindmap.features.collaboration.dto.InviteRequest;
import com.example.mindmap.features.collaboration.dto.PermissionUpdateRequest; // DTO mới
import com.example.mindmap.features.collaboration.dto.ShareSettingsRequest; // DTO mới
import com.example.mindmap.features.collaboration.dto.ShareSettingsResponse; // DTO mới

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/mindmaps/{mindmapId}") // Chuyển mindmapId lên base
public class CollaborationController {

    private final CollaborationService collaborationService;

    public CollaborationController(CollaborationService collaborationService) {
        this.collaborationService = collaborationService;
    }
    
    // --- Quản lý Public Sharing ---

    @PutMapping("/share-settings")
    @PreAuthorize("isAuthenticated()") // Logic quyền (phải là owner) sẽ ở service
    public ResponseEntity<ShareSettingsResponse> updatePublicShareSettings(
            @PathVariable String mindmapId,
            @Valid @RequestBody ShareSettingsRequest request) {
        return ResponseEntity.ok(collaborationService.updatePublicShareSettings(mindmapId, request));
    }
    
    // --- Quản lý Collaborator ---

    @GetMapping("/collaborators")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CollaboratorResponse>> getCollaborators(@PathVariable String mindmapId) {
        return ResponseEntity.ok(collaborationService.getCollaborators(mindmapId));
    }

    @PostMapping("/collaborators")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CollaboratorResponse> addCollaborator(
            @PathVariable String mindmapId,
            @Valid @RequestBody InviteRequest request) {
        return new ResponseEntity<>(collaborationService.addCollaborator(mindmapId, request), HttpStatus.CREATED);
    }
    
    @PutMapping("/collaborators/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CollaboratorResponse> updateCollaboratorPermission(
            @PathVariable String mindmapId,
            @PathVariable String userId,
            @Valid @RequestBody PermissionUpdateRequest request) {
        // Đây là Endpoint #11
        return ResponseEntity.ok(collaborationService.updateCollaboratorPermission(mindmapId, userId, request));
    }

    @DeleteMapping("/collaborators/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeCollaborator(
            @PathVariable String mindmapId,
            @PathVariable String userId) {
        collaborationService.removeCollaborator(mindmapId, userId);
        return ResponseEntity.noContent().build();
    }
}
