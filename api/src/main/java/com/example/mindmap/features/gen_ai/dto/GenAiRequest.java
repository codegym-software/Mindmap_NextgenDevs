package com.example.mindmap.features.gen_ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GenAiRequest {
    @NotBlank
    private String topic;

    @Min(1)
    @Max(5)
    private int depth = 2;

    @Min(5)
    @Max(200)
    private int maxNodes = 30;

    private String language = "vi";

    private Double temperature = 0.6;
}
