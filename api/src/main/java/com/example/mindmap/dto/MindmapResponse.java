package com.example.mindmap.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
public class MindmapResponse {
    private String id;
    private String name;
    private String ownerSub;
    private Map<String, Object> content;
    private Instant createdAt;
    private Instant updatedAt;
}
