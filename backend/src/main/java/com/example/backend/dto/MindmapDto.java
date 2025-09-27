package com.example.backend.dto;

import java.time.Instant;
import java.util.List;

public class MindmapDto {
    public static class CreateRequest {
        public String name;
    }

    public static class UpdateRequest {
        public String name; // Cho phép cập nhật tên mindmap
        // Có thể thêm các trường khác nếu cần, ví dụ: description
    }

    public static class NodeDto {
        public Long id;
        public Long parentId; // Có thể null nếu là root node
        public String content;
        public Double positionX;
        public Double positionY;
        public Integer radius;
    }

    public static class MindmapCardDto {
        public Long id;
        public String name;
        public Instant updatedAt;
        // Thêm createdAt nếu cần
        // public Instant createdAt;
    }

    public static class MindmapFullDto {
        public Long id;
        public String name;
        public List<NodeDto> nodes;
        // Thêm updatedAt nếu muốn phản hồi thời gian cập nhật
        // public Instant updatedAt;
    }

    // Added missing response DTOs
    public static class CreateResponse {
        public Long id;
        public String name;
        public Long rootNodeId;
    }

    public static class UpdateResponse {
        public Long id;
        public String name;
        public Instant updatedAt;
    }
}