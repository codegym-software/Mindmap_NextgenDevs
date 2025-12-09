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
    private final UserService userService;     // QUAN TRỌNG: để tự động sync user từ Cognito
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
        this.userService = userService;       // inject UserService
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
    // 2. CẬP NHẬT QUYỀN CỦA NGƯỜI HỢP TÁC
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
    // 3. MỜI NGƯỜI DÙNG MỚI – HỖ TRỢ EMAIL CHƯA TỪNG ĐĂNG NHẬP
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

        // [QUAN TRỌNG] Dùng UserService để đảm bảo lấy/ tạo user với UUID chuẩn
        User userToInvite = userService.getOrCreateUserByEmail(request.email());

        if (userToInvite.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Cannot invite yourself.");
        }

        // Tìm xem đã mời chưa
        Collaboration collaboration = collaborationRepository
                .findByMindmapIdAndUserId(mindmapId, userToInvite.getId())
                .orElse(new Collaboration());

        collaboration.setMindmapId(mindmapId);
        collaboration.setUserId(userToInvite.getId()); // Lưu UUID, KHÔNG lưu email
        collaboration.setPermission(request.permission());
        collaboration.setStatus(Collaboration.InviteStatus.ACCEPTED);
        collaboration.setInvitedBy(currentUserId);

        collaborationRepository.save(collaboration);

        return new CollaboratorResponse(
                userToInvite.getId(),
                userToInvite.getDisplayName(),
                userToInvite.getAvatarUrl(),
                request.permission()
        );
    }

    // ===================================================================
    // 4. XÓA NGƯỜI HỢP TÁC
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
    // 5. LẤY DANH SÁCH NGƯỜI HỢP TÁC
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

    @Transactional
    public void requestAccess(String mindmapId) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        
        // 1. Kiểm tra Mindmap có tồn tại không
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);

        // 2. Kiểm tra nếu user đã là Owner hoặc đã có trong danh sách Collaborator
        boolean isOwner = mindmap.getOwnerId().equals(currentUserId);
        boolean isCollaborator = collaborationRepository.existsByMindmapIdAndUserId(mindmapId, currentUserId);

        if (isOwner || isCollaborator) {
            // Nếu đã có quyền rồi thì không cần làm gì, trả về thành công luôn
            return;
        }

        // 3. Gửi thông báo (TODO: Tích hợp Notification Service hoặc Email Service)
        // Hiện tại ta sẽ Log ra console để biết request đã đến nơi
        User requester = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        log.info("🔔 [REQUEST ACCESS] User '{}' ({}) đang xin quyền truy cập vào Mindmap '{}' (Owner: {})", 
                requester.getDisplayName(), 
                currentUserId, 
                mindmap.getName(), 
                mindmap.getOwnerId());
                
        // Tại đây bạn có thể lưu một bản ghi vào bảng "AccessRequests" nếu muốn quản lý danh sách yêu cầu.
    }
}
