// src/main/java/com/example/mindmap/websocket/MindmapUpdateHandler.java
package com.example.mindmap.websocket;

import java.io.IOException; // [NEW]
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus; // [UPDATE]
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class MindmapUpdateHandler extends TextWebSocketHandler {

     private static final Logger log = LoggerFactory.getLogger(MindmapUpdateHandler.class);
     
     // [UPDATE] Cấu trúc: Map<MindmapId, Map<SessionId, Session>>
     // Dùng để quản lý các "phòng" (room)
     private final Map<String, Map<String, WebSocketSession>> mindmapRooms = new ConcurrentHashMap<>();

     // [NEW] Hàm helper để lấy mindmapId từ URI
     private String getMindmapId(WebSocketSession session) {
         String path = session.getUri().getPath(); // /ws/mindmap/abc-123
         try {
             return path.substring(path.lastIndexOf('/') + 1);
         } catch (Exception e) {
             log.error("Could not extract mindmapId from URI: {}", path);
             return null;
         }
     }

     // [NEW] Hàm helper để lấy userId từ attributes (đã được AuthInterceptor đưa vào)
     private String getUserId(WebSocketSession session) {
         return (String) session.getAttributes().get("userId");
     }

     @Override
     public void afterConnectionEstablished(WebSocketSession session) throws Exception {
         // [UPDATE] Thêm logic quản lý phòng
         String mindmapId = getMindmapId(session);
         String userId = getUserId(session);
         
         if (userId == null || mindmapId == null) {
             log.warn("Closing connection: No userId found in session or invalid mindmapId. URI: {}", session.getUri());
             session.close(CloseStatus.POLICY_VIOLATION);
             return;
         }

         // Thêm session vào phòng
         mindmapRooms.computeIfAbsent(mindmapId, k -> new ConcurrentHashMap<>()).put(session.getId(), session);

         log.info("WebSocket [User: {}] connected to [Mindmap: {}]. Session: {}. Total sessions in room: {}", 
             userId, mindmapId, session.getId(), mindmapRooms.get(mindmapId).size());
         
         // [NEW] Gửi tin nhắn "user-joined" cho những người khác trong phòng
         // (Gói tin nhắn này phải được FE hiểu)
         String joinMessage = String.format("{\"type\": \"USER_JOINED\", \"payload\": {\"userId\": \"%s\"}}", userId);
         broadcast(mindmapId, session, new TextMessage(joinMessage));
     }

     @Override
     protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
         // [UPDATE] Triển khai logic broadcast
         String mindmapId = getMindmapId(session);
         String userId = getUserId(session);
         
         if (mindmapId == null || userId == null) return; // Session có thể đang trong quá trình đóng
         
         String payload = message.getPayload();
         log.debug("WebSocket [User: {}] sent message to [Mindmap: {}]: {}", userId, mindmapId, payload);

         // Gửi tin nhắn cho tất cả client khác trong cùng phòng
         broadcast(mindmapId, session, message);
     }

     @Override
     public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
         // [UPDATE] Dọn dẹp session
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
                 // Nếu phòng trống, xóa phòng
                 mindmapRooms.remove(mindmapId);
             }
         }
         
         log.info("WebSocket [User: {}] disconnected from [Mindmap: {}]. Status: {}. Sessions left in room: {}", 
             (userId != null ? userId : "unknown"), mindmapId, status.getCode(), (room != null ? room.size() : 0));

         // [NEW] Gửi tin nhắn "user-left"
         if (userId != null) {
             String leftMessage = String.format("{\"type\": \"USER_LEFT\", \"payload\": {\"userId\": \"%s\"}}", userId);
             broadcast(mindmapId, session, new TextMessage(leftMessage)); // Sẽ không gửi cho chính session đã đóng
         }
     }

     // [NEW] Hàm helper để broadcast tin nhắn
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