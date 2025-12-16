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

    // ✅ NEW: MongoDB queue for access requests
    private final AccessRequestRepository accessRequestRepository;

    private static final Logger log = LoggerFactory.getLogger(CollaborationService.class);

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public CollaborationService(CollaborationRepository collaborationRepository,
                                MindmapService mindmapService,
                                MindmapRepository mindmapRepository,
                                UserRepository userRepository,
                                UserService userService,
                                AuthUtils authUtils,
                                AccessRequestRepository accessRequestRepository) {
        this.collaborationRepository = collaborationRepository;
        this.mindmapService = mindmapService;
        this.mindmapRepository = mindmapRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.authUtils = authUtils;
        this.accessRequestRepository = accessRequestRepository;
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
    // 6. YÊU CẦU QUYỀN TRUY CẬP (REQUEST ACCESS) - ✅ DÙNG MONGODB QUEUE
    // ===================================================================
    @Transactional
    public void requestAccess(String mindmapId, Permission requestedPerm) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        // Owner không cần xin quyền
        if (mindmap.getOwnerId().equals(currentUserId)) return;

        // 1) Đã là collaborator (ACCEPTED) thì thôi
        collaborationRepository.findByMindmapIdAndUserId(mindmapId, currentUserId)
                .ifPresent(collab -> {
                    if (collab.getStatus() == Collaboration.InviteStatus.ACCEPTED) {
                        // throw runtime để “thoát sớm” khỏi lambda
                        throw new EarlyReturnRuntime();
                    }
                });
        // Nếu đã EarlyReturn thì return
        if (EarlyReturnRuntime.consumeIfThrown()) return;

        // 2) Đã có request đang chờ duyệt?
        if (accessRequestRepository.findByMindmapIdAndUserId(mindmapId, currentUserId).isPresent()) {
            throw new IllegalArgumentException("Yêu cầu của bạn đang chờ duyệt.");
        }

        // 3) Tạo request mới + cache info user để owner hiển thị list
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        AccessRequest request = AccessRequest.builder()
                .mindmapId(mindmapId)
                .userId(currentUserId)
                .requestedPermission(requestedPerm)
                .requesterEmail(user.getEmail())
                .requesterName(user.getDisplayName())
                .requesterAvatar(user.getAvatarUrl())
                .build();

        accessRequestRepository.save(request);
        log.info("User {} requested {} access to mindmap {}", currentUserId, requestedPerm, mindmapId);

        // TODO: bắn websocket notify owner
    }

    // ===================================================================
    // 7. DUYỆT YÊU CẦU (APPROVE) - ✅ XOÁ REQUEST + UPSERT COLLAB ACCEPTED
    // ===================================================================
    @Transactional
    public void approveRequest(String mindmapId, String requesterId, Permission permissionToGrant) {
        String currentOwnerId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        if (!mindmap.getOwnerId().equals(currentOwnerId)) {
            throw new AccessDeniedException("Chỉ chủ sở hữu mới được duyệt.");
        }

        // 1) Xoá request khỏi queue Mongo
        accessRequestRepository.deleteByMindmapIdAndUserId(mindmapId, requesterId);

        // 2) Upsert Collaboration -> ACCEPTED
        Collaboration collab = collaborationRepository.findByMindmapIdAndUserId(mindmapId, requesterId)
                .orElse(Collaboration.builder()
                        .mindmapId(mindmapId)
                        .userId(requesterId)
                        .type(Collaboration.InviteType.REQUEST_ACCESS)
                        .build());

        collab.setPermission(permissionToGrant);
        collab.setStatus(Collaboration.InviteStatus.ACCEPTED);
        collab.setDecidedBy(currentOwnerId);
        collab.setDecidedAt(Instant.now());

        collaborationRepository.save(collab);
        log.info("Owner {} approved access for {} with permission {}", currentOwnerId, requesterId, permissionToGrant);
    }

    // ===================================================================
    // 8. TỪ CHỐI YÊU CẦU (REJECT) - ✅ CHỈ XOÁ REQUEST
    // ===================================================================
    @Transactional
    public void rejectRequest(String mindmapId, String requesterId) {
        String currentOwnerId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        if (!mindmap.getOwnerId().equals(currentOwnerId)) {
            throw new AccessDeniedException("Chỉ chủ sở hữu mới được từ chối.");
        }

        // Chỉ cần xoá request khỏi queue là coi như reject
        accessRequestRepository.deleteByMindmapIdAndUserId(mindmapId, requesterId);
        log.info("Owner {} rejected access for {}", currentOwnerId, requesterId);
    }

    // ===================================================================
    // 9. [MỚI] LẤY DANH SÁCH YÊU CẦU (CHO OWNER)
    // ===================================================================
    @Transactional(readOnly = true)
    public List<AccessRequest> getPendingRequests(String mindmapId) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        if (!mindmap.getOwnerId().equals(currentUserId)) {
            throw new AccessDeniedException("Bạn không có quyền xem danh sách yêu cầu.");
        }

        return accessRequestRepository.findByMindmapId(mindmapId);
    }

    /**
     * Trick nhỏ để thoát sớm khỏi lambda ifPresent mà vẫn giữ code “ít đụng repo”.
     * Bạn có thể thay bằng existsBy... nếu repo của bạn đã có method đó.
     */
    private static final class EarlyReturnRuntime extends RuntimeException {
        private static final ThreadLocal<Boolean> thrown = ThreadLocal.withInitial(() -> false);

        private EarlyReturnRuntime() {
            thrown.set(true);
        }

        static boolean consumeIfThrown() {
            boolean v = thrown.get();
            thrown.set(false);
            return v;
        }
    }
}
