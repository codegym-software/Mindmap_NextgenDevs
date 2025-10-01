package com.example.backend.dto;

import java.time.Instant;
import java.util.List;

public class MindmapDto {
    public static class CreateRequest {
        public String name;
    }

    public static class UpdateRequest {
        public String name; // Cho phép cập nhật tên mindmap
        // List of nodes to persist (full replacement of current structure except root auto-kept if omitted)
        public List<NodeDto> nodes; // optional: if null, only name is updated
    }

    public static class NodeDto {
        public Long id; // null => create new
        public Long parentId; // may be null for root
        public String content;
        public Double positionX;
        public Double positionY;
        public Integer radius;
    }

    public static class MindmapCardDto {
        public Long id;
        public String name;
        public Instant updatedAt;
    }

    public static class MindmapFullDto {
        public Long id;
        public String name;
        public List<NodeDto> nodes;
    }

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