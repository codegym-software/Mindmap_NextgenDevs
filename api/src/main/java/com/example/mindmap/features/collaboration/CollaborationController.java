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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.mindmap.features.collaboration.dto.CollaboratorResponse;
import com.example.mindmap.features.collaboration.dto.InviteRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/mindmaps/{mindmapId}/collaborators")
public class CollaborationController {

    private final CollaborationService collaborationService;

    public CollaborationController(CollaborationService collaborationService) {
        this.collaborationService = collaborationService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CollaboratorResponse>> getCollaborators(@PathVariable String mindmapId) {
        return ResponseEntity.ok(collaborationService.getCollaborators(mindmapId));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CollaboratorResponse> addCollaborator(
            @PathVariable String mindmapId,
            @Valid @RequestBody InviteRequest request) {
        return new ResponseEntity<>(collaborationService.addCollaborator(mindmapId, request), HttpStatus.CREATED);
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeCollaborator(
            @PathVariable String mindmapId,
            @PathVariable String userId) {
        collaborationService.removeCollaborator(mindmapId, userId);
        return ResponseEntity.noContent().build();
    }
    
    // You can add a PUT/PATCH endpoint to update permissions later
}