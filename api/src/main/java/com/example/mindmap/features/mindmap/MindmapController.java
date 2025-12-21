// src/main/java/com/example/mindmap/features/mindmap/MindmapController.java
package com.example.mindmap.features.mindmap;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.mindmap.features.collaboration.AccessRequest;
import com.example.mindmap.features.collaboration.CollaborationService;
import com.example.mindmap.features.collaboration.Permission;
import com.example.mindmap.features.collaboration.dto.ApproveAccessRequest;
import com.example.mindmap.features.collaboration.dto.CollaboratorResponse;
import com.example.mindmap.features.collaboration.dto.InviteRequest;
import com.example.mindmap.features.collaboration.dto.PermissionUpdateRequest;
import com.example.mindmap.features.collaboration.dto.RequestAccessRequest;
import com.example.mindmap.features.collaboration.dto.ShareSettingsRequest;
import com.example.mindmap.features.collaboration.dto.ShareSettingsResponse;
import com.example.mindmap.features.mindmap.dto.MindmapDetailResponse;
import com.example.mindmap.features.mindmap.dto.MindmapSummaryResponse;
import com.example.mindmap.features.mindmap.dto.MindmapSyncRequest;
import com.example.mindmap.features.mindmap.dto.MindmapUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/mindmaps")
public class MindmapController {

    private final MindmapService mindmapService;
    private final CollaborationService collaborationService;

    public MindmapController(MindmapService mindmapService, CollaborationService collaborationService) {
        this.mindmapService = mindmapService;
        this.collaborationService = collaborationService;
        
        // --- LOG DEBUG ĐỂ BẠN CHECK ---
        System.out.println("\n\n========================================");
        System.out.println(">>> MINDMAP CONTROLLER: OK! ĐÃ CÓ FULL API <<<");
        System.out.println("========================================\n\n");
    }

    // ======================================================================
    // 1. MINDMAP CORE
    // ======================================================================

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MindmapSummaryResponse>> listMindmapsForCurrentUser(@RequestParam(required = false) String search) {
        List<MindmapSummaryResponse> mindmaps = mindmapService.listForCurrentUser(search);
        return ResponseEntity.ok(mindmaps);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> createMindmap(@Valid @RequestBody MindmapUpdateRequest request) {
        MindmapDetailResponse createdMindmap = mindmapService.createMindmap(request);
        return new ResponseEntity<>(createdMindmap, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> getMindmapById(@PathVariable String id) {
        MindmapDetailResponse mindmap = mindmapService.getMindmapForCurrentUser(id);
        return ResponseEntity.ok(mindmap);
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> updateMindmap(@PathVariable String id, @Valid @RequestBody MindmapUpdateRequest request) {
        MindmapDetailResponse updatedMindmap = mindmapService.updateMindmap(id, request);
        return ResponseEntity.ok(updatedMindmap);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteMindmap(@PathVariable String id) {
        mindmapService.deleteMindmap(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> duplicateMindmap(@PathVariable String id) {
        MindmapDetailResponse duplicatedMindmap = mindmapService.duplicateMindmap(id);
        return new ResponseEntity<>(duplicatedMindmap, HttpStatus.CREATED);
    }

    @GetMapping(value = "/{id}/export/text", produces = MediaType.TEXT_PLAIN_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> exportMindmapAsText(@PathVariable String id) {
        String text = mindmapService.exportMindmapAsText(id);
        return ResponseEntity.ok(text);
    }

    @PostMapping("/sync")
    @PreAuthorize("isAuthenticated() and !hasAuthority('SCOPE_GUEST')")
    public ResponseEntity<List<MindmapSummaryResponse>> syncGuestMindmaps(@Valid @RequestBody List<MindmapSyncRequest> requestList) {
        List<MindmapSummaryResponse> syncedMindmaps = mindmapService.syncGuestMindmaps(requestList);
        return new ResponseEntity<>(syncedMindmaps, HttpStatus.CREATED);
    }

    // ======================================================================
    // 2. COLLABORATION API (Trước đó bạn bị thiếu phần này)
    // ======================================================================

    @PutMapping("/{id}/share-settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ShareSettingsResponse> updatePublicShareSettings(
            @PathVariable String id,
            @Valid @RequestBody ShareSettingsRequest request
    ) {
        ShareSettingsResponse response = collaborationService.updatePublicShareSettings(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/collaborators")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CollaboratorResponse>> getCollaborators(@PathVariable String id) {
        List<CollaboratorResponse> collaborators = collaborationService.getCollaborators(id);
        return ResponseEntity.ok(collaborators);
    }

    @PostMapping("/{id}/collaborators")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CollaboratorResponse> addCollaborator(
            @PathVariable String id,
            @Valid @RequestBody InviteRequest request
    ) {
        CollaboratorResponse collaborator = collaborationService.addCollaborator(id, request);
        return new ResponseEntity<>(collaborator, HttpStatus.CREATED);
    }

    @PutMapping("/{id}/collaborators/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CollaboratorResponse> updateCollaboratorPermission(
            @PathVariable String id,
            @PathVariable String userId,
            @Valid @RequestBody PermissionUpdateRequest request
    ) {
        CollaboratorResponse updated = collaborationService.updateCollaboratorPermission(id, userId, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}/collaborators/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeCollaborator(
            @PathVariable String id,
            @PathVariable String userId
    ) {
        collaborationService.removeCollaborator(id, userId);
        return ResponseEntity.noContent().build();
    }

    // ======================================================================
    // 3. ACCESS REQUEST API (Phần quan trọng nhất đang bị thiếu)
    // ======================================================================

    @PostMapping("/{id}/request-access")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> requestAccess(
            @PathVariable String id,
            @RequestBody(required = false) RequestAccessRequest body
    ) {
        Permission requestedPerm = (body != null && body.requestedPermission() != null)
                ? body.requestedPermission()
                : Permission.VIEWER;

        collaborationService.requestAccess(id, requestedPerm);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/{id}/requests/{userId}/approve")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> approveRequest(
            @PathVariable String id,
            @PathVariable String userId,
            @Valid @RequestBody ApproveAccessRequest body
    ) {
        collaborationService.approveRequest(id, userId, body.permission());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/requests/{userId}/reject")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> rejectRequest(
            @PathVariable String id,
            @PathVariable String userId
    ) {
        collaborationService.rejectRequest(id, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AccessRequest>> getPendingRequests(@PathVariable String id) {
        return ResponseEntity.ok(collaborationService.getPendingRequests(id));
    }
}