package com.example.mindmap.features.mindmap.dto;

import com.example.mindmap.features.mindmap.content.MindmapContent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MindmapSyncRequest(
        String id,  

        @NotBlank
        String name,

        @NotNull
        MindmapContent content,

        String createdAt
) {}
