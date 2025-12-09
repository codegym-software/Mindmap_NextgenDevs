// src/main/java/com/example/mindmap/websocket/MindmapUpdateHandler.java
package com.example.mindmap.websocket;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

// DTOs & JSON
import com.example.mindmap.websocket.dto.BroadcastPatch;
import com.example.mindmap.websocket.dto.GenericPatch;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

// [THÊM IMPORT] cho check quyền
import com.example.mindmap.features.mindmap.Mindmap;
import com.example.mindmap.features.mindmap.MindmapRepository;
import com.example.mindmap.features.collaboration.CollaborationRepository;

@Component
public class MindmapUpdateHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(MindmapUpdateHandler.class);

    // ObjectMapper (JSON)
    private final ObjectMapper objectMapper;

    // [MỚI] Dependencies để check quyền trong DB
    private final MindmapRepository mindmapRepository;
    private final CollaborationRepository collaborationRepository;

    // Cấu trúc: Map<MindmapId, Map<SessionId, Session>>
    private final Map<String, Map<String, WebSocketSession>> mindmapRooms = new ConcurrentHashMap<>();

    /**
     * Constructor: Inject ObjectMapper + Repositories
     */
    public MindmapUpdateHandler(ObjectMapper objectMapper,
                                MindmapRepository mindmapRepository,
                                CollaborationRepository collaborationRepository) {
        this.objectMapper = objectMapper;
        this.mindmapRepository = mindmapRepository;
        this.collaborationRepository = collaborationRepository;
    }

    /**
     * Khôi phục logic đầy đủ cho hàm getMindmapId
     */
    private String getMindmapId(WebSocketSession session) {
        String path = session.getUri().getPath(); // /ws/mindmap/abc-123
        try {
            return path.substring(path.lastIndexOf('/') + 1);
        } catch (Exception e) {
            log.error("Could not extract mindmapId from URI: {}", path);
            return null;
        }
    }

    // Hàm helper để lấy userId từ attributes
    private String getUserId(WebSocketSession session) {
        return (String) session.getAttributes().get("userId");
    }

    /**
     * WebSocket: onConnect
     * - Check userId & mindmapId hợp lệ
     * - [MỚI] Check quyền truy cập mindmap trong DB
     * - Join room
     * - Broadcast USER_JOINED (dùng cấu trúc Patch)
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String mindmapId = getMindmapId(session);
        String userId = getUserId(session);

        if (userId == null || mindmapId == null) {
            log.warn("Closing connection: No userId found in session or invalid mindmapId. URI: {}", session.getUri());
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        // [MỚI] === SECURITY CHECK: Kiểm tra quyền truy cập trước khi cho join room ===
        boolean hasAccess = checkAccess(mindmapId, userId);
        if (!hasAccess) {
            log.warn("⛔ WebSocket Rejected: User {} tried to join Mindmap {} without permission.", userId, mindmapId);
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        // [HẾT PHẦN MỚI] ==========================================================

        mindmapRooms.computeIfAbsent(mindmapId, k -> new ConcurrentHashMap<>()).put(session.getId(), session);


        log.info("WebSocket [User: {}] connected to [Mindmap: {}]. Session: {}. Total sessions in room: {}",
                userId, mindmapId, session.getId(), mindmapRooms.get(mindmapId).size());

        // Gửi tin nhắn "USER_JOINED" dùng cấu trúc Patch
        try {
            BroadcastPatch joinMessage = new BroadcastPatch(
                    "USER_JOINED",
                    objectMapper.createObjectNode().put("userId", userId),
                    userId
            );
            broadcast(mindmapId, session, new TextMessage(objectMapper.writeValueAsString(joinMessage)));
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize USER_JOINED message", e);
        }
    }

    /**
     * [MỚI] Hàm kiểm tra quyền nhanh (tương tự MindmapService.checkViewPermission)
     */
    private boolean checkAccess(String mindmapId, String userId) {
        // 1. Tìm Mindmap
        Mindmap mindmap = mindmapRepository.findById(mindmapId).orElse(null);
        if (mindmap == null) return false;

        // 2. Nếu là Owner -> OK
        if (mindmap.getOwnerId().equals(userId)) return true;

        // 3. Nếu Mindmap Public (VIEW) -> OK
        if (mindmap.getAccessSettings() != null &&
            mindmap.getAccessSettings().isPublic() &&
            mindmap.getAccessSettings().getPublicAccessLevel() == Mindmap.PublicAccessLevel.VIEW) {
            return true;
        }

        // 4. Nếu có trong danh sách Collaborator -> OK
        return collaborationRepository.existsByMindmapIdAndUserId(mindmapId, userId);
    }

    /**
     * Xử lý tin nhắn Patch từ client
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String mindmapId = getMindmapId(session);
        String userId = getUserId(session);

        if (mindmapId == null || userId == null) return;

        String payload = message.getPayload();

        try {
            // 1. Deserialize tin nhắn nhận được (chỉ có type và payload)
            GenericPatch patch = objectMapper.readValue(payload, GenericPatch.class);

            // 2. Tạo một tin nhắn broadcast (thêm senderId)
            BroadcastPatch broadcastMessage = new BroadcastPatch(
                    patch.type(),
                    patch.payload(),
                    userId
            );

            // 3. Re-serialize tin nhắn broadcast
            String messageToSend = objectMapper.writeValueAsString(broadcastMessage);

            log.debug("WebSocket [User: {}] broadcasting [Type: {}] to [Mindmap: {}]",
                    userId, patch.type(), mindmapId);

            // 4. Gửi tin nhắn (đã thêm senderId) cho tất cả client khác
            broadcast(mindmapId, session, new TextMessage(messageToSend));

        } catch (JsonProcessingException e) {
            log.warn("WebSocket [User: {}] sent invalid JSON to [Mindmap: {}]: {}",
                    userId, mindmapId, payload, e);
            // Không broadcast nếu JSON không hợp lệ
        }
    }

    /**
     * Gửi thông báo 'USER_LEFT'
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String mindmapId = getMindmapId(session);
        String userId = getUserId(session);

        if (mindmapId == null) {
            log.warn("Could not determine mindmapId on disconnect for session {}", session.getId());
            return;
        }

        Map<String, WebSocketSession> room = mindmapRooms.get(mindmapId);
        if (room != null) {
            room.remove(session.getId());
            if (room.isEmpty()) {
                mindmapRooms.remove(mindmapId);
            }
        }

        log.info("WebSocket [User: {}] disconnected from [Mindmap: {}]. Status: {}. Sessions left in room: {}",
                (userId != null ? userId : "unknown"),
                mindmapId,
                status.getCode(),
                (room != null ? room.size() : 0));

        // Gửi tin nhắn "USER_LEFT" dùng cấu trúc Patch
        if (userId != null) {
            try {
                BroadcastPatch leftMessage = new BroadcastPatch(
                        "USER_LEFT",
                        objectMapper.createObjectNode().put("userId", userId),
                        userId
                );
                broadcast(mindmapId, session, new TextMessage(objectMapper.writeValueAsString(leftMessage)));
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize USER_LEFT message", e);
            }
        }
    }

    /**
     * Hàm helper để broadcast tin nhắn
     * - Chỉ gửi cho các session khác, không gửi lại cho người gửi
     */
    private void broadcast(String mindmapId, WebSocketSession senderSession, TextMessage message) {
        Map<String, WebSocketSession> room = mindmapRooms.get(mindmapId);
        if (room == null) {
            return;
        }

        for (WebSocketSession session : room.values()) {
            // Chỉ gửi cho các session khác, không gửi lại cho người gửi
            if (session.isOpen() && !session.getId().equals(senderSession.getId())) {
                try {
                    session.sendMessage(message);
                } catch (IOException e) {
                    log.error("Failed to send message to session {}: {}", session.getId(), e.getMessage());
                }
            }
        }
    }
}
