// src/main/java/com/example/mindmap/core/model/Auditable.java
package com.example.mindmap.core.model;

import java.time.Instant;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import lombok.Data;

@Data
public abstract class Auditable {
    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}