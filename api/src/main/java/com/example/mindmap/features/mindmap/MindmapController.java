// src/main/java/com/example/mindmap/features/mindmap/MindmapController.java
package com.example.mindmap.features.mindmap;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.mindmap.features.mindmap.dto.MindmapCreateRequest;
import com.example.mindmap.features.mindmap.dto.MindmapDetailResponse;
import com.example.mindmap.features.mindmap.dto.MindmapSummaryResponse;
import com.example.mindmap.features.mindmap.dto.MindmapUpdateRequest;

import jakarta.validation.Valid;

/**
 * REST Controller quản lý các Mindmap.
 * Bao gồm CRUD cơ bản, nhân bản và xuất mindmap dưới dạng text.
 */
@RestController
@RequestMapping("/api/mindmaps")
public class MindmapController {

    private final MindmapService mindmapService;

    public MindmapController(MindmapService mindmapService) {
        this.mindmapService = mindmapService;
    }

    /**
     * Lấy danh sách mindmap của user hiện tại.
     * Hỗ trợ tìm kiếm qua query param "search".
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MindmapSummaryResponse>> listMindmapsForCurrentUser(
            @RequestParam(required = false) String search
    ) {
        List<MindmapSummaryResponse> mindmaps = mindmapService.listForCurrentUser(search);
        return ResponseEntity.ok(mindmaps);
    }

    /**
     * Tạo mới một mindmap.
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> createMindmap(
            @Valid @RequestBody MindmapCreateRequest request
    ) {
        MindmapDetailResponse createdMindmap = mindmapService.createMindmap(request);
        return new ResponseEntity<>(createdMindmap, HttpStatus.CREATED);
    }

    /**
     * Lấy thông tin chi tiết một mindmap theo id.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> getMindmapById(@PathVariable String id) {
        MindmapDetailResponse mindmap = mindmapService.getMindmapForCurrentUser(id);
        return ResponseEntity.ok(mindmap);
    }

    /**
     * Cập nhật một mindmap theo id.
     */
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> updateMindmap(
            @PathVariable String id,
            @Valid @RequestBody MindmapUpdateRequest request
    ) {
        MindmapDetailResponse updatedMindmap = mindmapService.updateMindmap(id, request);
        return ResponseEntity.ok(updatedMindmap);
    }

    /**
     * Xóa một mindmap theo id.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteMindmap(@PathVariable String id) {
        mindmapService.deleteMindmap(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Nhân bản một mindmap.
     * Owner của bản sao là user hiện tại.
     */
    @PostMapping("/{id}/duplicate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MindmapDetailResponse> duplicateMindmap(@PathVariable String id) {
        MindmapDetailResponse duplicatedMindmap = mindmapService.duplicateMindmap(id);
        return new ResponseEntity<>(duplicatedMindmap, HttpStatus.CREATED);
    }

    /**
     * Xuất mindmap dưới dạng plain text.
     */
    @GetMapping(value = "/{id}/export/text", produces = MediaType.TEXT_PLAIN_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> exportMindmapAsText(@PathVariable String id) {
        String text = mindmapService.exportMindmapAsText(id);
        return ResponseEntity.ok(text);
    }

    // --- Các Endpoint cho Giai đoạn 3 (Embed/SaaS) sẽ được triển khai sau ---
}
