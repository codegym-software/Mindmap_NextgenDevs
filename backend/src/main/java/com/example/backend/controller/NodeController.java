package com.example.backend.controller;

import com.example.backend.dto.NodeDto;
import com.example.backend.service.NodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mindmaps/{mindmapId}/nodes")
public class NodeController {
    private final NodeService nodeService;

    public NodeController(NodeService nodeService) { this.nodeService = nodeService; }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal Jwt jwt, @PathVariable Long mindmapId) {
        try {
            List<NodeDto> nodes = nodeService.list(jwt, mindmapId);
            return ResponseEntity.ok(nodes);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long mindmapId,
                                    @RequestBody NodeDto.CreateRequest req) {
        try {
            NodeDto dto = nodeService.create(jwt, mindmapId, req);
            return ResponseEntity.ok(dto);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{nodeId}")
    public ResponseEntity<?> update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long mindmapId,
                                     @PathVariable Long nodeId, @RequestBody NodeDto.UpdateRequest req) {
        try {
            NodeDto dto = nodeService.update(jwt, mindmapId, nodeId, req);
            return ResponseEntity.ok(dto);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{nodeId}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long mindmapId,
                                     @PathVariable Long nodeId) {
        try {
            nodeService.delete(jwt, mindmapId, nodeId);
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

