package com.example.mindmap.model;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document("mindmaps")
@CompoundIndex(def = "{ 'ownerSub': 1, 'updatedAt': -1 }")
public class Mindmap {

    @Id
    private String id;

    @NotBlank
    private String name;

    /** Cognito user sub */
    @Indexed
    private String ownerSub;

    /** JSON tree for nodes/edges (linh hoạt để đổi layout/biểu diễn) */
    private Map<String, Object> content;

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    /** Optimistic locking cho các case nhiều client/real-time */
    @Version
    private Long version;
}
