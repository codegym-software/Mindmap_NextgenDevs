package com.example.mindmap.config;

import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.index.CompoundIndexDefinition;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;

import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

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
        ensureCollectionIndexes("users", Set.of(
                new Index().on("email", Sort.Direction.ASC).unique(),
                new Index().on("displayName", Sort.Direction.ASC)
        ));

        ensureCollectionIndexes("mindmaps", Set.of(
                new Index().on("name", Sort.Direction.ASC),
                new Index().on("ownerId", Sort.Direction.ASC),
                new Index().on("accessSettings.isPublic", Sort.Direction.ASC),
                new Index().on("workspaceId", Sort.Direction.ASC),
                new Index().on("tags", Sort.Direction.ASC),
                new Index().on("updatedAt", Sort.Direction.DESC)
        ));

        ensureCollectionIndexes("collaborators", Set.of(
                new CompoundIndexDefinition(new org.bson.Document()
                        .append("mindmapId", 1)
                        .append("userId", 1)).unique(),
                new Index().on("userId", Sort.Direction.ASC)
                // Consider an index on mindmapId if you frequently list collaborators for a map
                // new Index().on("mindmapId", Sort.Direction.ASC)
        ));

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

     // Configure ObjectMapper for MongoDB with case-insensitive enums
    @Bean
    public com.fasterxml.jackson.databind.ObjectMapper mongoObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS);
        mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        return mapper;
    }
}