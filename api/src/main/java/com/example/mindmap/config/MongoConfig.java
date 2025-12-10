package com.example.mindmap.config;

import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.CompoundIndexDefinition;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;

import jakarta.annotation.PostConstruct;


@Configuration
public class MongoConfig {

    private static final Logger log = LoggerFactory.getLogger(MongoConfig.class);
    private final MongoTemplate mongoTemplate;

    public MongoConfig(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @PostConstruct // Run after bean initialization
    public void ensureIndexes() {
        log.info("Ensuring MongoDB indexes are created...");
        // Define required indexes for each collection based on @Document annotation
        
        // 1. Users Collection
        ensureCollectionIndexes("users", Set.of(
                new Index().on("email", Sort.Direction.ASC).unique(),
                new Index().on("displayName", Sort.Direction.ASC)
        ));

        // 2. Mindmaps Collection
        ensureCollectionIndexes("mindmaps", Set.of(
                new Index().on("name", Sort.Direction.ASC),
                new Index().on("ownerId", Sort.Direction.ASC),
                new Index().on("accessSettings.isPublic", Sort.Direction.ASC),
                new Index().on("workspaceId", Sort.Direction.ASC),
                new Index().on("tags", Sort.Direction.ASC),
                new Index().on("updatedAt", Sort.Direction.DESC)
        ));

        // [REMOVED] Collaborators Collection
        // Chúng ta đã chuyển sang dùng @CompoundIndexes trong Collaboration.java
        // Spring Data MongoDB sẽ tự động tạo index khi khởi động.
        // Việc xóa đoạn code này tránh conflict giữa code và annotation.

        // 3. Editor Themes Collection
        ensureCollectionIndexes("editor_themes", Set.of(
                new Index().on("name", Sort.Direction.ASC).unique(),
                new Index().on("isSystemTheme", Sort.Direction.ASC)
        ));
        
        log.info("MongoDB index check complete.");
    }

    private void ensureCollectionIndexes(String collectionName, Set<Index> requiredIndexes) {
        IndexOperations indexOps = mongoTemplate.indexOps(collectionName);
        // It's generally safe to just call ensureIndex in dev/startup.
        // For production with zero downtime, more sophisticated index management might be needed.
        requiredIndexes.forEach(index -> {
            log.debug("Ensuring index on {}: {}", collectionName, index.getIndexKeys());
            indexOps.ensureIndex(index);
        });
    }
}