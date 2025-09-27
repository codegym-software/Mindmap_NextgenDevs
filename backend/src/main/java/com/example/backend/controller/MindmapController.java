package com.example.backend.controller;

import com.example.backend.dto.MindmapDto;
import com.example.backend.service.MindmapService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mindmaps")
public class MindmapController {

    private final MindmapService mindmapService;

    public MindmapController(MindmapService mindmapService) {
        this.mindmapService = mindmapService;
    }

    @GetMapping
    public ResponseEntity<List<MindmapDto.MindmapCardDto>> listMindmaps(@AuthenticationPrincipal Jwt jwt) {
        try {
            List<MindmapDto.MindmapCardDto> mindmaps = mindmapService.getMindmaps(jwt);
            return ResponseEntity.ok(mindmaps);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).body(null);
        }
    }

    @PostMapping
    public ResponseEntity<?> createMindmap(@AuthenticationPrincipal Jwt jwt, @RequestBody MindmapDto.CreateRequest req) {
        try {
            MindmapDto.CreateResponse response = mindmapService.createMindmap(jwt, req);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMindmap(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        try {
            MindmapDto.MindmapFullDto mindmap = mindmapService.getMindmap(jwt, id);
            return ResponseEntity.ok(mindmap);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMindmap(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @RequestBody MindmapDto.UpdateRequest req) {
        try {
            MindmapDto.UpdateResponse response = mindmapService.updateMindmap(jwt, id, req);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMindmap(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        try {
            mindmapService.deleteMindmap(jwt, id);
            return ResponseEntity.ok(Map.of("message", "Mindmap deleted"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        }
    }
}