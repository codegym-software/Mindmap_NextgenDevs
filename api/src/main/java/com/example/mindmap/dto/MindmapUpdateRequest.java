package com.example.mindmap.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

@Data
public class MindmapUpdateRequest {
    // Không bắt buộc, nếu gửi thì kiểm tra độ dài
    @Size(max = 200)
    private String name;

    // Có thể chỉ cập nhật content
    private Map<String, Object> content;
}
