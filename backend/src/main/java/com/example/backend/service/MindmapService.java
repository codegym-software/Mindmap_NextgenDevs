package com.example.backend.service;

import com.example.backend.dto.MindmapDto;
import com.example.backend.model.Mindmap;
import com.example.backend.model.Node;
import com.example.backend.model.User;
import com.example.backend.repository.MindmapRepository;
import com.example.backend.repository.NodeRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MindmapService {

    private final MindmapRepository mindmapRepository;
    private final NodeRepository nodeRepository;
    private final UserRepository userRepository;

    public MindmapService(MindmapRepository mindmapRepository, NodeRepository nodeRepository, UserRepository userRepository) {
        this.mindmapRepository = mindmapRepository;
        this.nodeRepository = nodeRepository;
        this.userRepository = userRepository;
    }

    private User getOrCreateUser(Jwt jwt) {
        if (jwt == null) throw new IllegalStateException("User not authenticated");

        // Chỉ dùng sub làm email
        String sub = jwt.getClaimAsString("sub");
        if (sub == null || sub.isBlank()) {
            throw new IllegalStateException("No sub in JWT");
        }

        System.out.println("Debug: Using sub = " + sub); // Log để debug
        return userRepository.findByEmail(sub)
                .orElseGet(() -> {
                    User user = new User();
                    user.setEmail(sub);
                    user.setPasswordHash("external");
                    return userRepository.save(user);
                });
    }

    public List<MindmapDto.MindmapCardDto> getMindmaps(Jwt jwt) {
        User user = getOrCreateUser(jwt);
        System.out.println("Debug: User = [ID: " + user.getId() + ", Email: " + user.getEmail() + "]"); // Log debug
        List<Mindmap> mindmaps = mindmapRepository.findAllByUserOrderByUpdatedAtDesc(user);
        System.out.println("Debug: Found " + mindmaps.size() + " mindmaps"); // Log debug
        return mindmaps.stream().map(m -> {
            MindmapDto.MindmapCardDto card = new MindmapDto.MindmapCardDto();
            card.id = m.getId();
            card.name = m.getName();
            card.updatedAt = m.getUpdatedAt();
            return card;
        }).collect(Collectors.toList());
    }

    @Transactional
    public MindmapDto.CreateResponse createMindmap(Jwt jwt, MindmapDto.CreateRequest req) {
        User user = getOrCreateUser(jwt);
        if (req.name == null || req.name.isBlank()) {
            throw new IllegalArgumentException("Mindmap name is required");
        }

        Mindmap mindmap = new Mindmap();
        mindmap.setName(req.name);
        mindmap.setUser(user);
        Mindmap savedMindmap = mindmapRepository.save(mindmap);

        Node root = new Node();
        root.setMindmap(savedMindmap);
        root.setContent("Root");
        root.setPositionX(0.0);
        root.setPositionY(0.0);
        root.setRadius(50);
        Node savedRoot = nodeRepository.save(root);

        savedMindmap.setRootNode(savedRoot);
        mindmapRepository.save(savedMindmap);

        MindmapDto.CreateResponse response = new MindmapDto.CreateResponse();
        response.id = savedMindmap.getId();
        response.name = savedMindmap.getName();
        response.rootNodeId = savedRoot.getId();
        return response;
    }

    public MindmapDto.MindmapFullDto getMindmap(Jwt jwt, Long id) {
        User user = getOrCreateUser(jwt);
        Optional<Mindmap> mindmapOpt = mindmapRepository.findById(id);
        if (mindmapOpt.isEmpty()) {
            throw new IllegalArgumentException("Mindmap not found");
        }

        Mindmap mindmap = mindmapOpt.get();
        if (!mindmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Forbidden");
        }

        List<Node> nodes = nodeRepository.findByMindmap(mindmap);
        MindmapDto.MindmapFullDto full = new MindmapDto.MindmapFullDto();
        full.id = mindmap.getId();
        full.name = mindmap.getName();
        full.nodes = nodes.stream().map(n -> {
            MindmapDto.NodeDto nodeDto = new MindmapDto.NodeDto();
            nodeDto.id = n.getId();
            nodeDto.parentId = n.getParent() != null ? n.getParent().getId() : null;
            nodeDto.content = n.getContent();
            nodeDto.positionX = n.getPositionX();
            nodeDto.positionY = n.getPositionY();
            nodeDto.radius = n.getRadius();
            return nodeDto;
        }).collect(Collectors.toList());

        return full;
    }

    @Transactional
    public MindmapDto.UpdateResponse updateMindmap(Jwt jwt, Long id, MindmapDto.UpdateRequest req) {
        User user = getOrCreateUser(jwt);
        Optional<Mindmap> mindmapOpt = mindmapRepository.findById(id);
        if (mindmapOpt.isEmpty()) {
            throw new IllegalArgumentException("Mindmap not found");
        }

        Mindmap mindmap = mindmapOpt.get();
        if (!mindmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Forbidden");
        }

        mindmap.setName(req.name);
        mindmap.preUpdate(); // Cập nhật updatedAt
        mindmapRepository.save(mindmap);

        MindmapDto.UpdateResponse response = new MindmapDto.UpdateResponse();
        response.id = mindmap.getId();
        response.name = mindmap.getName();
        response.updatedAt = mindmap.getUpdatedAt();
        return response;
    }

    @Transactional
    public void deleteMindmap(Jwt jwt, Long id) {
        User user = getOrCreateUser(jwt);
        Optional<Mindmap> mindmapOpt = mindmapRepository.findById(id);
        if (mindmapOpt.isEmpty()) {
            throw new IllegalArgumentException("Mindmap not found");
        }

        Mindmap mindmap = mindmapOpt.get();
        if (!mindmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Forbidden");
        }

        nodeRepository.deleteByMindmap(mindmap);
        mindmapRepository.delete(mindmap);
    }
}