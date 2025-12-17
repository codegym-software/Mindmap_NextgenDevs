package com.example.mindmap.features.chat;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.features.mindmap.MindmapService;
import com.example.mindmap.features.mindmap.Mindmap;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mindmaps/{mindmapId}/messages")
public class ChatController {

    private final ChatRepository chatRepository;
    private final MindmapService mindmapService;
    private final AuthUtils authUtils;

    public ChatController(ChatRepository chatRepository, MindmapService mindmapService, AuthUtils authUtils) {
        this.chatRepository = chatRepository;
        this.mindmapService = mindmapService;
        this.authUtils = authUtils;
    }

    @GetMapping
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable String mindmapId) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        
        // 1. Check quyền (User phải có quyền VIEW mindmap mới xem được chat)
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);
        mindmapService.checkViewPermission(currentUserId, mindmap);

        // 2. Lấy toàn bộ lịch sử (Production nên limit 50-100 tin)
        List<ChatMessage> messages = chatRepository.findByMindmapIdOrderByCreatedAtAsc(mindmapId);
        
        return ResponseEntity.ok(messages);
    }
    
    // (Optional) API gửi tin nhắn qua HTTP nếu không dùng WebSocket
    @PostMapping
    public ResponseEntity<ChatMessage> sendMessage(@PathVariable String mindmapId, @RequestBody ChatMessage request) {
        String currentUserId = authUtils.getRequiredCurrentUserId();
        // Check quyền VIEW hoặc EDIT
        Mindmap mindmap = mindmapService.findMindmapById(mindmapId);
        mindmapService.checkViewPermission(currentUserId, mindmap); // Hoặc checkEditPermission tuỳ logic

        ChatMessage msg = new ChatMessage();
        msg.setMindmapId(mindmapId);
        msg.setUserId(currentUserId);
        msg.setSenderName(request.getSenderName()); // FE gửi lên hoặc lấy từ DB User
        msg.setContent(request.getContent());
        
        return ResponseEntity.ok(chatRepository.save(msg));
    }
}