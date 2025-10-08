package com.example.mindmap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

@Data
public class MindmapUpsertRequest {
    @NotBlank
    @Size(max = 200)
    private String name;

    // JSON: nodes/edges...
    private Map<String, Object> content;
}
