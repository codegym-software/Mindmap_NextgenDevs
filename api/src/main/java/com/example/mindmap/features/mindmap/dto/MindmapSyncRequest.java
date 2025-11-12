package com.example.mindmap.features.mindmap.dto;

import com.example.mindmap.features.mindmap.content.MindmapContent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/**
 * DTO (Data Transfer Object) dùng để nhận dữ liệu
 * khi người dùng Guest đồng bộ (sync) mindmap lên server.
 *
 * Chứa các trường mà FE (dataMapper.ts) gửi lên.
 */
public record MindmapSyncRequest(
        @NotBlank
        String name,

        @NotNull
        MindmapContent content,

        // Chúng ta nhận 'createdAt' (String ISO) từ guest
        // để giữ lại ngày tạo gốc
        String createdAt
) {}