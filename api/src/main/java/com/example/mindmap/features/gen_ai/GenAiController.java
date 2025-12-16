// src/main/java/com/example/mindmap/features/gen_ai/GenAiController.java
package com.example.mindmap.features.gen_ai;

import com.example.mindmap.features.gen_ai.dto.GenAiRequest;
import com.example.mindmap.features.gen_ai.dto.GenAiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/generate")
@RequiredArgsConstructor
public class GenAiController {
    private final GenAiService genAiService;

    @PostMapping("/mindmap")
    public ResponseEntity<GenAiResponse> generateMindmap(@Valid @RequestBody GenAiRequest req) {
        String content = genAiService.generateMindmap(req);
        return ResponseEntity.ok(new GenAiResponse(content));
    }
}