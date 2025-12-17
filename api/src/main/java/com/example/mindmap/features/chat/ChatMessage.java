package com.example.mindmap.features.chat;

import com.example.mindmap.core.model.Auditable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Document(collection = "chat_messages")
public class ChatMessage extends Auditable {
    @Id
    private String id;

    @Indexed // Đánh index để query theo mindmap nhanh hơn
    private String mindmapId;

    private String userId;      // ID người gửi
    private String senderName;  // Tên người gửi (Snapshot tại thời điểm gửi để hiển thị nhanh)
    
    private String content;     // Nội dung tin nhắn
}