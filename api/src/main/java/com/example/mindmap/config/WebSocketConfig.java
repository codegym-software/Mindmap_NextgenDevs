package com.example.mindmap.config;

import com.example.mindmap.websocket.MindmapUpdateHandler; // Placeholder import
import com.example.mindmap.websocket.WebSocketAuthInterceptor; // Placeholder import
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final MindmapUpdateHandler mindmapUpdateHandler;
    private final WebSocketAuthInterceptor authInterceptor;

    // Inject handlers/interceptors
    public WebSocketConfig(MindmapUpdateHandler mindmapUpdateHandler, WebSocketAuthInterceptor authInterceptor) {
        this.mindmapUpdateHandler = mindmapUpdateHandler;
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(mindmapUpdateHandler, "/ws/mindmap/{mindmapId}") // Endpoint pattern
                .addInterceptors(authInterceptor) // Secure the connection
                .setAllowedOrigins("*"); // Configure allowed origins carefully for production!
                // Consider using SockJS for fallback: .withSockJS();
    }
}