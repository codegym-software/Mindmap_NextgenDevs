package com.example.mindmap.features.gen_ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenAiResponse {
    /**
     * Raw JSON or text returned by the model. Frontend can parse as needed.
     */
    private String content;
}
