// src/main/java/com/example/mindmap/features/auth/AuthController.java
package com.example.mindmap.features.auth;

import com.example.mindmap.features.auth.dto.GuestSessionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth") // Endpoint này sẽ được permitAll trong SecurityConfig
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Endpoint #25: Tạo một phiên làm việc cho khách (Guest).
     * Trả về một Guest JWT và thông tin user guest.
     */
    @PostMapping("/guest")
    public ResponseEntity<GuestSessionResponse> createGuestSession() {
        return ResponseEntity.ok(authService.createGuestSession());
    }
}
