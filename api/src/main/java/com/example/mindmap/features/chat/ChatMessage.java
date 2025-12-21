package com.example.mindmap.features.chat;

import com.example.mindmap.core.model.Auditable;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "chat_messages")
public class ChatMessage extends Auditable {
    @Id
    private String id;

    @Indexed // Đánh index để query theo mindmap nhanh hơn
    private String mindmapId;

    private String userId;      // ID người gửi
    private String senderName;  // Tên người gửi (Snapshot tại thời điểm gửi để hiển thị nhanh)
    
    private String content;     // Nội dung tin nhắn

    // Constructors
    public ChatMessage() {}

    // Manual Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMindmapId() { return mindmapId; }
    public void setMindmapId(String mindmapId) { this.mindmapId = mindmapId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}