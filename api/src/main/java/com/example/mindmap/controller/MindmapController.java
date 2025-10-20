package com.example.mindmap.controller;

import com.example.mindmap.dto.MindmapCreateRequest;
import com.example.mindmap.dto.MindmapUpdateRequest;
import com.example.mindmap.dto.MindmapUpsertRequest;
import com.example.mindmap.model.Mindmap;
import com.example.mindmap.service.MindmapService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mindmaps")
public class MindmapController {

    private final MindmapService service;

    public MindmapController(MindmapService service) {
        this.service = service;
    }

    @GetMapping
    public List<Mindmap> list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(jwt.getSubject());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mindmap create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MindmapCreateRequest body) {
        return service.create(jwt.getSubject(), body);
    }

    @GetMapping("/{id}")
    public Mindmap get(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") String id) {
        return service.getOwned(jwt.getSubject(), id);
    }

    @PutMapping("/{id}")
    public Mindmap update(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") String id, @Valid @RequestBody MindmapUpdateRequest body) {
        return service.update(jwt.getSubject(), id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") String id) {
        service.delete(jwt.getSubject(), id);
    }

    /**
     * Import/sync từ guest (localStorage FE) vào tài khoản sau khi đăng nhập.
     * FE gửi MẢNG: [ { name, content, createdAt? }, ... ]
     */
    @PostMapping("/sync")
    public List<Mindmap> sync(@AuthenticationPrincipal Jwt jwt, @RequestBody List<@Valid MindmapUpsertRequest> guests) {
        return service.importGuest(jwt.getSubject(), guests);
    }
}
