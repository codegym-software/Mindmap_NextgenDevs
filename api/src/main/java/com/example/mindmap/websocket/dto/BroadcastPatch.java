package com.example.mindmap.websocket.dto;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * DTO (Data Transfer Object) mà Backend sẽ broadcast (gửi đi)
 * cho tất cả các client khác trong phòng.
 *
 * Nó bao gồm bản vá gốc (type, payload) VÀ 'senderId'.
 *
 * 'senderId' rất quan trọng để FE (ở Giai đoạn 9) có thể
 * nhận diện tin nhắn này là "của người khác" và áp dụng thay đổi,
 * thay vì áp dụng lại thay đổi của chính mình.
 */
public record BroadcastPatch(
    String type,
    JsonNode payload,
    String senderId
) {
}