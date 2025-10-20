package com.example.mindmap.service;

import com.example.mindmap.dto.MindmapCreateRequest;
import com.example.mindmap.dto.MindmapUpdateRequest;
import com.example.mindmap.dto.MindmapUpsertRequest;
import com.example.mindmap.model.Mindmap;
import com.example.mindmap.repository.MindmapRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class MindmapService {

    private final MindmapRepository repo;

    public MindmapService(MindmapRepository repo) {
        this.repo = repo;
    }

    public List<Mindmap> list(String ownerSub) {
        return repo.findByOwnerSubOrderByUpdatedAtDesc(ownerSub);
    }

    public Mindmap getOwned(String ownerSub, String id) {
        Mindmap m = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!ownerSub.equals(m.getOwnerSub())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return m;
    }

    public Mindmap create(String ownerSub, MindmapCreateRequest req) {
        Mindmap m = new Mindmap();
        m.setName(req.getName());
        m.setOwnerSub(ownerSub);
        m.setContent(req.getContent() == null ? defaultContent() : req.getContent());
        m.setCreatedAt(Instant.now());
        m.setUpdatedAt(Instant.now());
        return repo.save(m);
    }

    public Mindmap update(String ownerSub, String id, MindmapUpdateRequest req) {
        Mindmap m = getOwned(ownerSub, id);
        if (req.getName() != null) {
            String nm = req.getName().trim();
            if (nm.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name cannot be blank");
            m.setName(nm);
        }
        if (req.getContent() != null) {
            m.setContent(req.getContent());
        }
        m.setUpdatedAt(Instant.now());
        return repo.save(m);
    }

    public void delete(String ownerSub, String id) {
        Mindmap m = getOwned(ownerSub, id);
        repo.delete(m);
    }

    public List<Mindmap> importGuest(String ownerSub, List<MindmapUpsertRequest> guests) {
        Instant now = Instant.now();
        List<Mindmap> batch = guests.stream().map(g -> {
            Mindmap m = new Mindmap();
            String nm = (g.getName() == null || g.getName().isBlank()) ? "Imported Mindmap" : g.getName();
            m.setName(nm);
            m.setOwnerSub(ownerSub);
            m.setContent(g.getContent() == null ? defaultContent() : g.getContent());
            m.setCreatedAt(now);
            m.setUpdatedAt(now);
            return m;
        }).toList();
        return repo.saveAll(batch);
    }

    private Map<String,Object> defaultContent() {
        return Map.of(
            "nodes", Map.of("root", Map.of("id","root","text","Root","x",0,"y",0)),
            "edges", List.of()
        );
    }
}
