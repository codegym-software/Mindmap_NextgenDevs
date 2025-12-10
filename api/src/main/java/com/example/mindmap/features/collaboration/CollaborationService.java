package com.example.mindmap.features.collaboration;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.core.exception.AccessDeniedException;
import com.example.mindmap.core.exception.ResourceNotFoundException;
import com.example.mindmap.features.collaboration.dto.*;
import com.example.mindmap.features.mindmap.Mindmap;
import com.example.mindmap.features.mindmap.MindmapRepository;
import com.example.mindmap.features.mindmap.MindmapService;
import com.example.mindmap.features.user.User;
import com.example.mindmap.features.user.UserRepository;
import com.example.mindmap.features.user.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class CollaborationService {

    private final CollaborationRepository collaborationRepository;
    private final MindmapService mindmapService;
    private final MindmapRepository mindmapRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final AuthUtils authUtils;

    private static final Logger log = LoggerFactory.getLogger(CollaborationService.class);

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public CollaborationService(CollaborationRepository collaborationRepository,
                                MindmapService mindmapService,
                                MindmapRepository mindmapRepository,
                                UserRepository userRepository,
                                UserService userService,
                                AuthUtils authUtils) {
        this.collaborationRepository = collaborationRepository;
        this.mindmapService = mindmapService;
        this.mindmapRepository = mindmapRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.authUtils = authUtils;
    }

    // ===================================================================
    // 1. CẬP NHẬT CÀI ĐẶT CHIA SẺ CÔNG KHAI
    // ===================================================================
    @Transactional
    public ShareSettingsResponse updatePublicShareSettings(String mindmapId, ShareSettingsRequest request) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        if (!mindmap.getOwnerId().equals(currentUserId)) {
            throw new AccessDeniedException("Only the mindmap owner can change share settings.");
        }

        Mindmap.AccessSettings settings = mindmap.getAccessSettings();
        settings.setPublic(request.isPublic());

        if (!request.isPublic()) {
            settings.setPublicAccessLevel(Mindmap.PublicAccessLevel.DISABLED);
        } else {
            if (request.publicAccessLevel() == Mindmap.PublicAccessLevel.DISABLED) {
                throw new IllegalArgumentException("Cannot set public access to DISABLED when isPublic is true.");
            }
            settings.setPublicAccessLevel(request.publicAccessLevel());
        }

        Mindmap savedMindmap = mindmapRepository.save(mindmap);
        return ShareSettingsResponse.fromMindmap(savedMindmap, frontendBaseUrl);
    }

    // ===================================================================
    // 2. CẬP NHẬT QUYỀN CỦA NGƯỜI HỢP TÁC (UPDATE PERMISSION)
    // ===================================================================
    @Transactional
    public CollaboratorResponse updateCollaboratorPermission(String mindmapId,
                                                             String collaboratorId,
                                                             PermissionUpdateRequest request) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        if (!mindmap.getOwnerId().equals(currentUserId)) {
            throw new AccessDeniedException("Only the mindmap owner can change permissions.");
        }

        if (request.permission() == Permission.OWNER) {
            throw new IllegalArgumentException("Cannot assign OWNER permission.");
        }

        if (collaboratorId.equals(currentUserId)) {
            throw new IllegalArgumentException("Owner cannot change their own permissions.");
        }

        Collaboration collaboration = collaborationRepository
                .findByMindmapIdAndUserId(mindmapId, collaboratorId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration", "user_id", collaboratorId));

        collaboration.setPermission(request.permission());
        
        // Nếu đang ở trạng thái Pending/Rejected mà Owner chủ động set quyền -> coi như Approve luôn
        if (collaboration.getStatus() != Collaboration.InviteStatus.ACCEPTED) {
            collaboration.setStatus(Collaboration.InviteStatus.ACCEPTED);
            collaboration.setDecidedBy(currentUserId);
            collaboration.setDecidedAt(Instant.now());
        }
        
        collaborationRepository.save(collaboration);

        User user = userRepository.findById(collaboratorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", collaboratorId));

        return new CollaboratorResponse(
                user.getId(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                collaboration.getPermission()
        );
    }

    // ===================================================================
    // 3. MỜI NGƯỜI DÙNG MỚI (INVITE)
    // ===================================================================
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

        // Lấy hoặc tạo user nếu chưa tồn tại (Logic Safe Invite)
        User userToInvite = userService.getOrCreateUserByEmail(request.email());

        if (userToInvite.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Cannot invite yourself.");
        }

        Collaboration collaboration = collaborationRepository
                .findByMindmapIdAndUserId(mindmapId, userToInvite.getId())
                .orElse(new Collaboration());

        collaboration.setMindmapId(mindmapId);
        collaboration.setUserId(userToInvite.getId());
        collaboration.setPermission(request.permission());
        
        // [QUAN TRỌNG] Owner mời trực tiếp -> Trạng thái là ACCEPTED (ACTIVE) luôn
        collaboration.setStatus(Collaboration.InviteStatus.ACCEPTED);
        collaboration.setType(Collaboration.InviteType.INVITE);
        collaboration.setInvitedBy(currentUserId);
        
        // Reset thông tin duyệt cũ (nếu có)
        collaboration.setDecidedBy(currentUserId);
        collaboration.setDecidedAt(Instant.now());

        collaborationRepository.save(collaboration);

        return new CollaboratorResponse(
                userToInvite.getId(),
                userToInvite.getDisplayName(),
                userToInvite.getAvatarUrl(),
                request.permission()
        );
    }

    // ===================================================================
    // 4. XÓA NGƯỜI HỢP TÁC (REMOVE)
    // ===================================================================
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

        Collaboration collaboration = collaborationRepository
                .findByMindmapIdAndUserId(mindmapId, collaboratorId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration", "user_id", collaboratorId));

        collaborationRepository.delete(collaboration);
    }

    // ===================================================================
    // 5. LẤY DANH SÁCH COLLABORATOR (CHỈ LẤY ACTIVE)
    // ===================================================================
    @Transactional(readOnly = true)
    public List<CollaboratorResponse> getCollaborators(String mindmapId) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        mindmapService.checkViewPermission(currentUserId, mindmap);

        List<Collaboration> collaborations = collaborationRepository.findByMindmapId(mindmapId);
        
        List<String> userIds = collaborations.stream()
                .map(Collaboration::getUserId)
                .toList();

        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return collaborations.stream()
                // [QUAN TRỌNG] Chỉ trả về user đã được chấp nhận (Active)
                .filter(c -> c.getStatus() == Collaboration.InviteStatus.ACCEPTED)
                .map(c -> {
                    User user = userMap.get(c.getUserId());
                    if (user == null) return null;
                    return new CollaboratorResponse(
                            user.getId(),
                            user.getDisplayName(),
                            user.getAvatarUrl(),
                            c.getPermission()
                    );
                })
                .filter(Objects::nonNull)
                .toList();
    }

    // ===================================================================
    // 6. YÊU CẦU QUYỀN TRUY CẬP (REQUEST ACCESS) - [MỚI]
    // ===================================================================
    @Transactional
    public void requestAccess(String mindmapId, Permission requestedPerm) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        // Owner không cần xin quyền
        if (mindmap.getOwnerId().equals(currentUserId)) {
            return;
        }

        Optional<Collaboration> existing = collaborationRepository.findByMindmapIdAndUserId(mindmapId, currentUserId);

        if (existing.isPresent()) {
            Collaboration collab = existing.get();
            if (collab.getStatus() == Collaboration.InviteStatus.ACCEPTED) {
                return; // Đã có quyền rồi
            }
            if (collab.getStatus() == Collaboration.InviteStatus.PENDING) {
                // Đã xin rồi, chờ duyệt
                throw new IllegalArgumentException("You have already requested access. Please wait for approval.");
            }
            // Nếu từng bị từ chối (REJECTED), cho phép xin lại -> Update thành PENDING
            collab.setStatus(Collaboration.InviteStatus.PENDING);
            collab.setType(Collaboration.InviteType.REQUEST_ACCESS);
            collab.setRequestedPermission(requestedPerm);
            collab.setDecidedBy(null);
            collab.setDecidedAt(null);
            
            collaborationRepository.save(collab);
            return;
        }

        // Tạo Request mới
        Collaboration newRequest = Collaboration.builder()
                .mindmapId(mindmapId)
                .userId(currentUserId)
                .permission(Permission.VIEWER) // Quyền mặc định khi tạo record (chưa có hiệu lực vì status=PENDING)
                .requestedPermission(requestedPerm)
                .status(Collaboration.InviteStatus.PENDING)
                .type(Collaboration.InviteType.REQUEST_ACCESS)
                .build();

        collaborationRepository.save(newRequest);
        log.info("User {} requested {} access to mindmap {}", currentUserId, requestedPerm, mindmapId);
        
        // TODO: Gửi Notification cho Owner (nếu có hệ thống thông báo)
    }

    // ===================================================================
    // 7. DUYỆT YÊU CẦU (APPROVE) - [MỚI]
    // ===================================================================
    @Transactional
    public void approveRequest(String mindmapId, String requesterId, Permission permissionToGrant) {
        String currentOwnerId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        if (!mindmap.getOwnerId().equals(currentOwnerId)) {
            throw new AccessDeniedException("Only owner can approve requests.");
        }

        Collaboration collab = collaborationRepository.findByMindmapIdAndUserId(mindmapId, requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found for user", "id", requesterId));

        collab.setPermission(permissionToGrant);
        collab.setStatus(Collaboration.InviteStatus.ACCEPTED); // -> ACTIVE
        collab.setRequestedPermission(null); // Clear thông tin request
        collab.setDecidedBy(currentOwnerId);
        collab.setDecidedAt(Instant.now());

        collaborationRepository.save(collab);
        log.info("Owner {} approved access for {} with permission {}", currentOwnerId, requesterId, permissionToGrant);
    }

    // ===================================================================
    // 8. TỪ CHỐI YÊU CẦU (REJECT) - [MỚI]
    // ===================================================================
    @Transactional
    public void rejectRequest(String mindmapId, String requesterId) {
        String currentOwnerId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        if (!mindmap.getOwnerId().equals(currentOwnerId)) {
            throw new AccessDeniedException("Only owner can reject requests.");
        }

        Collaboration collab = collaborationRepository.findByMindmapIdAndUserId(mindmapId, requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found for user", "id", requesterId));

        collab.setStatus(Collaboration.InviteStatus.REJECTED);
        collab.setDecidedBy(currentOwnerId);
        collab.setDecidedAt(Instant.now());

        collaborationRepository.save(collab);
        log.info("Owner {} rejected access for {}", currentOwnerId, requesterId);
    }
}