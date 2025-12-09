// src/main/java/com/example/mindmap/features/collaboration/CollaborationController.java
package com.example.mindmap.features.collaboration;

import com.example.mindmap.features.collaboration.dto.CollaboratorResponse;
import com.example.mindmap.features.collaboration.dto.InviteRequest;
import com.example.mindmap.features.collaboration.dto.PermissionUpdateRequest;
import com.example.mindmap.features.collaboration.dto.ShareSettingsRequest;
import com.example.mindmap.features.collaboration.dto.ShareSettingsResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; // Rest + Mapping

import java.util.List;

@RestController
@RequestMapping("/api/mindmaps/{mindmapId}") // mindmapId nằm ở base path
// Nếu muốn fix CORS chỉ riêng controller này, bạn có thể bật dòng dưới:
// @CrossOrigin(origins = "http://localhost:3000")
public class CollaborationController {

    private final CollaborationService collaborationService;

    public CollaborationController(CollaborationService collaborationService) {
        this.collaborationService = collaborationService;
    }

    // ======================================================================
    // 1. QUẢN LÝ CHIA SẺ CÔNG KHAI (PUBLIC SHARE SETTINGS)
    // ======================================================================

    @PutMapping("/share-settings")
    @PreAuthorize("isAuthenticated()") // Check owner ở tầng Service
    public ResponseEntity<ShareSettingsResponse> updatePublicShareSettings(
            @PathVariable String mindmapId,
            @Valid @RequestBody ShareSettingsRequest request
    ) {
        ShareSettingsResponse response =
                collaborationService.updatePublicShareSettings(mindmapId, request);
        return ResponseEntity.ok(response);
    }

    // ======================================================================
    // 2. QUẢN LÝ COLLABORATOR
    // ======================================================================

    /**
     * Lấy danh sách collaborator của mindmap.
     */
    @GetMapping("/collaborators")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CollaboratorResponse>> getCollaborators(
            @PathVariable String mindmapId
    ) {
        List<CollaboratorResponse> collaborators =
                collaborationService.getCollaborators(mindmapId);
        return ResponseEntity.ok(collaborators);
    }

    /**
     * Mời collaborator mới bằng email.
     */
    @PostMapping("/collaborators")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CollaboratorResponse> addCollaborator(
            @PathVariable String mindmapId,
            @Valid @RequestBody InviteRequest request
    ) {
        CollaboratorResponse collaborator =
                collaborationService.addCollaborator(mindmapId, request);
        return new ResponseEntity<>(collaborator, HttpStatus.CREATED);
    }

        @PostMapping("/request-access")
    @PreAuthorize("isAuthenticated()") // Bắt buộc phải đăng nhập mới được xin quyền
    public ResponseEntity<Void> requestAccess(@PathVariable String mindmapId) {
        collaborationService.requestAccess(mindmapId);
        return ResponseEntity.ok().build();
    }

    /**
     * Cập nhật quyền của collaborator (EDITOR / VIEWER).
     */
    @PutMapping("/collaborators/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CollaboratorResponse> updateCollaboratorPermission(
            @PathVariable String mindmapId,
            @PathVariable String userId,
            @Valid @RequestBody PermissionUpdateRequest request
    ) {
        CollaboratorResponse updated =
                collaborationService.updateCollaboratorPermission(mindmapId, userId, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Xóa collaborator khỏi mindmap.
     */
    @DeleteMapping("/collaborators/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeCollaborator(
            @PathVariable String mindmapId,
            @PathVariable String userId
    ) {
        collaborationService.removeCollaborator(mindmapId, userId);
        return ResponseEntity.noContent().build();
    }
}
