package com.example.mindmap.model;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document("mindmaps")
public class Mindmap {
    @Id
    private String id;

    @NotBlank
    private String name;

    @Indexed
    private String ownerSub; // Cognito user sub

    private Map<String, Object> content; // JSON tree for nodes/edges

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}
