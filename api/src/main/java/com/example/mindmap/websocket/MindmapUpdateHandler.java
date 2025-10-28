// src/main/java/com/example/mindmap/websocket/MindmapUpdateHandler.java
package com.example.mindmap.websocket;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class MindmapUpdateHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(MindmapUpdateHandler.class);
    // Map<MindmapId, Map<SessionId, Session>>
    private final Map<String, Map<String, WebSocketSession>> mindmapSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // Extract mindmapId from URI and add session to the map
        log.info("WebSocket connection established: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // Handle incoming messages (e.g., node move, text change)
        // Broadcast changes to other clients in the same mindmap room
        String payload = message.getPayload();
        log.info("Received WebSocket message: {}", payload);
        // ... broadcast logic
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        // Remove session from the map
        log.info("WebSocket connection closed: {}", session.getId());
    }
}