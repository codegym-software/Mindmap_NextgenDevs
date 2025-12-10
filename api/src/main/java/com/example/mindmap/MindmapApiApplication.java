package com.example.mindmap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing; 

@SpringBootApplication
@EnableMongoAuditing
public class MindmapApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(MindmapApiApplication.class, args);
    }
}