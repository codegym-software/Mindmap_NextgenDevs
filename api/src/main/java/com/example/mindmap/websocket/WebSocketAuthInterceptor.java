// src/main/java/com/example/mindmap/websocket/WebSocketAuthInterceptor.java
package com.example.mindmap.websocket;

import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {
    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        // TODO: Implement JWT validation from query param or header for WebSocket handshake
        // If valid, add user details to attributes map for use in the handler
        // e.g., attributes.put("userId", userId);
        return true; // Return false to reject connection
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {
        // No-op
    }
}