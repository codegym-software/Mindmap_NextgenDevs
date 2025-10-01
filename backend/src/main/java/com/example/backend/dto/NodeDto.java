package com.example.backend.dto;

public class NodeDto {
    public Long id;
    public Long parentId;
    public Long mindmapId;
    public String content;
    public Double positionX;
    public Double positionY;
    public Integer radius;

    public static class CreateRequest {
        public Long parentId;
        public String content;
        public Double positionX;
        public Double positionY;
        public Integer radius;
    }

    public static class UpdateRequest {
        public String content;
        public Double positionX;
        public Double positionY;
        public Integer radius;
        public Long parentId; // optional re-parenting
    }

    public static NodeDto of(Long mindmapId, com.example.backend.model.Node n) {
        NodeDto dto = new NodeDto();
        dto.id = n.getId();
        dto.parentId = n.getParent() != null ? n.getParent().getId() : null;
        dto.mindmapId = mindmapId;
        dto.content = n.getContent();
        dto.positionX = n.getPositionX();
        dto.positionY = n.getPositionY();
        dto.radius = n.getRadius();
        return dto;
    }
}
