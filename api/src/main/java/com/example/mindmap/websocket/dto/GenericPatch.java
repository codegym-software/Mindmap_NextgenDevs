package com.example.mindmap.websocket.dto;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * DTO (Data Transfer Object) chung để nhận tất cả các loại "bản vá" (patch)
 * từ Frontend qua WebSocket.
 *
 * FE sẽ gửi JSON có dạng: {"type": "TÊN_HÀNH_ĐỘNG", "payload": { ... }}
 *
 * - 'type': Sẽ được đọc dưới dạng String (ví dụ: "NODE_MOVE").
 * - 'payload': Sẽ được giữ ở dạng JSON thô (JsonNode) để broadcast
 * trực tiếp mà không cần Backend hiểu chi tiết bên trong.
 */
public record GenericPatch(
    String type,
    JsonNode payload
) {
    // Sử dụng record (Java 16+) cho DTOs bất biến, ngắn gọn.
}