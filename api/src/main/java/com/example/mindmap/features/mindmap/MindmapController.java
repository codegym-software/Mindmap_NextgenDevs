// src/main/java/com/example/mindmap/features/mindmap/MindmapController.java
package com.example.mindmap.features.mindmap;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType; // Thêm MediaType
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
    
    // --- Các Endpoint mới (Giai đoạn 1) ---

    /**
     * Endpoint #6: Nhân bản mindmap.
     */
    @PostMapping("/{id}/duplicate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> duplicateMindmap(@PathVariable String id) {
        // Quyền: Phải xem được (VIEW) mindmap gốc
        // Owner của bản sao sẽ là user hiện tại
        return new ResponseEntity<>(mindmapService.duplicateMindmap(id), HttpStatus.CREATED);
    }

    /**
     * Endpoint #19: Xuất mindmap dưới dạng text.
     */
    @GetMapping(value = "/{id}/export/text", produces = MediaType.TEXT_PLAIN_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> exportMindmapAsText(@PathVariable String id) {
        // Quyền: Phải xem được (VIEW) mindmap
        return ResponseEntity.ok(mindmapService.exportMindmapAsText(id));
    }
    
    // Endpoint #20 (Embed) và #21, #22 (SaaS) sẽ ở Giai đoạn 3
}
