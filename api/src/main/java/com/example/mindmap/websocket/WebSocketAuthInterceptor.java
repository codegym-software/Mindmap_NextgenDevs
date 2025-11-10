// src/main/java/com/example/mindmap/websocket/WebSocketAuthInterceptor.java
package com.example.mindmap.websocket;

import java.util.Map;
import org.slf4j.Logger; // [NEW]
import org.slf4j.LoggerFactory; // [NEW]
import org.springframework.http.HttpStatus; // [NEW]
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.Jwt; // [NEW]
import org.springframework.security.oauth2.jwt.JwtDecoder; // [NEW]
import org.springframework.security.oauth2.jwt.JwtException; // [NEW]
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder; // [NEW]

@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

     private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class); // [NEW]
     private final JwtDecoder jwtDecoder; // [NEW]

     // [NEW] Inject JwtDecoder (Bean này đã được tạo trong SecurityConfig)
     public WebSocketAuthInterceptor(JwtDecoder jwtDecoder) {
         this.jwtDecoder = jwtDecoder;
     }

     @Override
     public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
         
         // [UPDATE] Triển khai logic xác thực JWT (thay thế TODO)
         try {
             // 1. Lấy token từ query param (ví dụ: /ws/mindmap/123?token=ey...)
             String token = UriComponentsBuilder.fromUri(request.getURI()).build()
                     .getQueryParams()
                     .getFirst("token");

             if (token == null || token.isBlank()) {
                 log.warn("WebSocket handshake: Missing token");
                 response.setStatusCode(HttpStatus.UNAUTHORIZED);
                 return false;
             }

             // 2. Giải mã và xác thực token
             Jwt jwt = jwtDecoder.decode(token);
             
             // 3. Lấy userId (sub) và lưu vào attributes của session
             String userId = jwt.getSubject();
             if (userId == null) {
                 log.warn("WebSocket handshake: Token is valid but missing 'sub' (userId) claim");
                 response.setStatusCode(HttpStatus.UNAUTHORIZED);
                 return false;
             }
             
             attributes.put("userId", userId);
             log.info("WebSocket handshake: Authenticated user {}", userId);
             return true; // Cho phép kết nối

         } catch (JwtException e) {
             log.warn("WebSocket handshake: Invalid token. {}", e.getMessage());
             response.setStatusCode(HttpStatus.UNAUTHORIZED);
             return false; // Từ chối kết nối
         } catch (Exception e) {
             log.error("WebSocket handshake: Unexpected error. {}", e.getMessage());
             response.setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR);
             return false; // Từ chối kết nối
         }
     }

     @Override
     public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {
         // No-op
     }
}