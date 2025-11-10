// src/main/java/com/example/mindmap/features/auth/AuthService.java
package com.example.mindmap.features.auth;

import com.example.mindmap.features.auth.dto.GuestSessionResponse;
import com.example.mindmap.features.user.User;
import com.example.mindmap.features.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.mindmap.core.auth.GuestJwtTokenProvider;

import java.net.URLEncoder; // [NEW] Import
import java.nio.charset.StandardCharsets; // [NEW] Import
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final GuestJwtTokenProvider guestJwtTokenProvider;

    public AuthService(UserRepository userRepository, GuestJwtTokenProvider guestJwtTokenProvider) {
        this.userRepository = userRepository;
        this.guestJwtTokenProvider = guestJwtTokenProvider;
    }

    /**
     * Tạo một user GUEST mới trong DB và tạo một Guest JWT cho user đó.
     */
    @Transactional
    public GuestSessionResponse createGuestSession() {
        // 1. Tạo user GUEST mới
        User guestUser = new User();
        String guestId = "guest_" + UUID.randomUUID().toString();
        guestUser.setId(guestId);
        guestUser.setStatus(User.UserStatus.GUEST);
        guestUser.setDisplayName("Guest User");
        guestUser.setEmail(guestId + "@guest.local"); // Email giả, unique
        
        // [FIX] Thêm avatar default khi tạo Guest
        guestUser.setAvatarUrl(createDefaultAvatarUrl("Guest User"));

        User savedUser = userRepository.save(guestUser);

        // 2. Tạo Guest JWT
        String token = guestJwtTokenProvider.createToken(savedUser.getId());

        // 3. Trả về session
        return new GuestSessionResponse(
                token,
                savedUser.getId(),
                savedUser.getDisplayName(),
                savedUser.getStatus()
        );
    }

    /**
     * [NEW] Helper tạo URL avatar default
     */
    private String createDefaultAvatarUrl(String displayName) {
        try {
            String encodedName = URLEncoder.encode(displayName, StandardCharsets.UTF_8.name());
            return "https://ui-avatars.com/api/?name=" + encodedName;
        } catch (Exception e) {
            // Fallback an toàn nếu encode lỗi (rất hiếm với UTF-8)
            return "https://ui-avatars.com/api/?name=User";
        }
    }
}