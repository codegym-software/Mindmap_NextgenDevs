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

// [MỚI GĐ 8] Import Jackson (JSON Library) và các DTOs
import com.example.mindmap.websocket.dto.BroadcastPatch;
import com.example.mindmap.websocket.dto.GenericPatch;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class MindmapUpdateHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(MindmapUpdateHandler.class);
    
    // [MỚI GĐ 8] Thư viện ObjectMapper (JSON)
    // Spring Boot tự động cung cấp Bean này, chúng ta chỉ cần Inject
    private final ObjectMapper objectMapper;

    // Cấu trúc: Map<MindmapId, Map<SessionId, Session>>
    private final Map<String, Map<String, WebSocketSession>> mindmapRooms = new ConcurrentHashMap<>();

    /**
     * [MỚI GĐ 8] Cập nhật constructor để Inject ObjectMapper
     */
    public MindmapUpdateHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * [FIX LỖI] Khôi phục logic đầy đủ cho hàm getMindmapId
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

    // [KHÔNG ĐỔI] Hàm helper để lấy userId từ attributes
    private String getUserId(WebSocketSession session) {
        return (String) session.getAttributes().get("userId");
    }

    /**
     * [CẬP NHẬT GĐ 8] Gửi thông báo 'USER_JOINED'
     * Chúng ta cập nhật logic này để gửi đi một JSON chuẩn (BroadcastPatch)
     * giống như các bản vá (patch) khác.
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

        mindmapRooms.computeIfAbsent(mindmapId, k -> new ConcurrentHashMap<>()).put(session.getId(), session);

        log.info("WebSocket [User: {}] connected to [Mindmap: {}]. Session: {}. Total sessions in room: {}", 
            userId, mindmapId, session.getId(), mindmapRooms.get(mindmapId).size());
        
        // [CẬP NHẬT GĐ 8] Gửi tin nhắn "USER_JOINED" dùng cấu trúc Patch
        try {
            BroadcastPatch joinMessage = new BroadcastPatch(
                "USER_JOINED", 
                objectMapper.createObjectNode().put("userId", userId), // Payload là JSON: {"userId": "..."}
                userId // Người gửi là chính user vừa vào
            );
            broadcast(mindmapId, session, new TextMessage(objectMapper.writeValueAsString(joinMessage)));
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize USER_JOINED message", e);
        }
    }

    /**
     * [CẬP NHẬT GĐ 8] Xử lý tin nhắn "Bản vá" (Patch)
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String mindmapId = getMindmapId(session);
        String userId = getUserId(session);
        
        if (mindmapId == null || userId == null) return;
        
        String payload = message.getPayload();
        
        try {
            // 1. [MỚI] Deserialize tin nhắn nhận được (chỉ có type và payload)
            GenericPatch patch = objectMapper.readValue(payload, GenericPatch.class);

            // 2. [MỚI] Tạo một tin nhắn broadcast (thêm senderId)
            BroadcastPatch broadcastMessage = new BroadcastPatch(
                patch.type(),
                patch.payload(),
                userId
            );

            // 3. [MỚI] Re-serialize tin nhắn broadcast
            String messageToSend = objectMapper.writeValueAsString(broadcastMessage);

            log.debug("WebSocket [User: {}] broadcasting [Type: {}] to [Mindmap: {}]", userId, patch.type(), mindmapId);

            // 4. Gửi tin nhắn (đã thêm senderId) cho tất cả client khác
            broadcast(mindmapId, session, new TextMessage(messageToSend));

        } catch (JsonProcessingException e) {
            log.warn("WebSocket [User: {}] sent invalid JSON to [Mindmap: {}]: {}", userId, mindmapId, payload, e);
            // Không broadcast nếu JSON không hợp lệ
        }
    }

    /**
     * [CẬP NHẬT GĐ 8] Gửi thông báo 'USER_LEFT'
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
            (userId != null ? userId : "unknown"), mindmapId, status.getCode(), (room != null ? room.size() : 0));

        // [CẬP NHẬT GĐ 8] Gửi tin nhắn "USER_LEFT" dùng cấu trúc Patch
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
     * [KHÔNG ĐỔI] Hàm helper để broadcast tin nhắn
     * Logic này vẫn đúng: chỉ gửi cho người khác, không gửi cho người gửi.
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