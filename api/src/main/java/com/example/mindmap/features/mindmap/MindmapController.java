// src/main/java/com/example/mindmap/features/mindmap/MindmapController.java
package com.example.mindmap.features.mindmap;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.mindmap.features.mindmap.dto.MindmapCreateRequest;
import com.example.mindmap.features.mindmap.dto.MindmapDetailResponse;
import com.example.mindmap.features.mindmap.dto.MindmapSummaryResponse;
import com.example.mindmap.features.mindmap.dto.MindmapUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/mindmaps")
public class MindmapController {

    private final MindmapService mindmapService;

    public MindmapController(MindmapService mindmapService) {
        this.mindmapService = mindmapService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MindmapSummaryResponse>> listMindmapsForCurrentUser() {
        return ResponseEntity.ok(mindmapService.listForCurrentUser());
    }
    
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> createMindmap(@Valid @RequestBody MindmapCreateRequest request) {
        return new ResponseEntity<>(mindmapService.createMindmap(request), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> getMindmapById(@PathVariable String id) {
        return ResponseEntity.ok(mindmapService.getMindmapForCurrentUser(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> updateMindmap(@PathVariable String id, @Valid @RequestBody MindmapUpdateRequest request) {
        return ResponseEntity.ok(mindmapService.updateMindmap(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteMindmap(@PathVariable String id) {
        mindmapService.deleteMindmap(id);
        return ResponseEntity.noContent().build();
    }
}