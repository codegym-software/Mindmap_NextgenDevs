package com.example.mindmap.features.collaboration;

import com.example.mindmap.features.collaboration.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mindmaps/{mindmapId}")
public class CollaborationController {

    private final CollaborationService collaborationService;

    public CollaborationController(CollaborationService collaborationService) {
        this.collaborationService = collaborationService;
    }

    // ======================================================================
    // 1. QUẢN LÝ CHIA SẺ CÔNG KHAI (PUBLIC SHARE SETTINGS)
    // ======================================================================

    @PutMapping("/share-settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ShareSettingsResponse> updatePublicShareSettings(
            @PathVariable String mindmapId,
            @Valid @RequestBody ShareSettingsRequest request
    ) {
        ShareSettingsResponse response = collaborationService.updatePublicShareSettings(mindmapId, request);
        return ResponseEntity.ok(response);
    }

    // ======================================================================
    // 2. QUẢN LÝ COLLABORATOR (CRUD)
    // ======================================================================

    /**
     * Lấy danh sách collaborator của mindmap.
     */
    @GetMapping("/collaborators")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CollaboratorResponse>> getCollaborators(
            @PathVariable String mindmapId
    ) {
        List<CollaboratorResponse> collaborators = collaborationService.getCollaborators(mindmapId);
        return ResponseEntity.ok(collaborators);
    }

    /**
     * Mời collaborator mới bằng email (Invite).
     */
    @PostMapping("/collaborators")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CollaboratorResponse> addCollaborator(
            @PathVariable String mindmapId,
            @Valid @RequestBody InviteRequest request
    ) {
        CollaboratorResponse collaborator = collaborationService.addCollaborator(mindmapId, request);
        return new ResponseEntity<>(collaborator, HttpStatus.CREATED);
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
        CollaboratorResponse updated = collaborationService.updateCollaboratorPermission(mindmapId, userId, request);
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

    // ======================================================================
    // 3. QUẢN LÝ LIFECYCLE (REQUEST / APPROVE / REJECT) - [MỚI]
    // ======================================================================

    /**
     * User tự xin quyền truy cập vào Mindmap (Request Access).
     * Body (optional): chứa requestedPermission (EDITOR/VIEWER). Mặc định là VIEWER.
     */
    @PostMapping("/request-access")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> requestAccess(
            @PathVariable String mindmapId,
            @RequestBody(required = false) RequestAccessRequest body
    ) {
        Permission requestedPerm = (body != null && body.requestedPermission() != null)
                ? body.requestedPermission()
                : Permission.VIEWER; // Default là Viewer nếu không gửi body

        collaborationService.requestAccess(mindmapId, requestedPerm);
        return ResponseEntity.accepted().build();
    }

    /**
     * Owner duyệt yêu cầu -> chuyển trạng thái thành ACCEPTED (ACTIVE).
     */
    @PostMapping("/requests/{userId}/approve")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> approveRequest(
            @PathVariable String mindmapId,
            @PathVariable String userId,
            @Valid @RequestBody ApproveAccessRequest body
    ) {
        collaborationService.approveRequest(mindmapId, userId, body.permission());
        return ResponseEntity.ok().build();
    }

    /**
     * Owner từ chối yêu cầu -> chuyển trạng thái thành REJECTED.
     */
    @PostMapping("/requests/{userId}/reject")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> rejectRequest(
            @PathVariable String mindmapId,
            @PathVariable String userId
    ) {
        collaborationService.rejectRequest(mindmapId, userId);
        return ResponseEntity.ok().build();
    }

        // [MỚI] API lấy danh sách yêu cầu đang chờ (để hiển thị icon chuông)
    @GetMapping("/requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AccessRequest>> getPendingRequests(@PathVariable String mindmapId) {
        return ResponseEntity.ok(collaborationService.getPendingRequests(mindmapId));
    }
}