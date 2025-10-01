package com.example.backend.service;

import com.example.backend.dto.MindmapDto;
import com.example.backend.model.Mindmap;
import com.example.backend.model.Node;
import com.example.backend.model.User; // fixed import
import com.example.backend.repository.MindmapRepository;
import com.example.backend.repository.NodeRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
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
        String sub = jwt.getClaimAsString("sub");
        if (sub == null || sub.isBlank()) {
            throw new IllegalStateException("No sub in JWT");
        }
        String email = jwt.getClaimAsString("email");
        User existing = userRepository.findByCognitoUsername(sub);
        if (existing != null) {
            return existing;
        }
        User user = new User();
        user.setCognitoUsername(sub);
        user.setEmail(email != null && !email.isBlank() ? email : ("user-" + sub));
        user.setCreatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    public List<MindmapDto.MindmapCardDto> getMindmaps(Jwt jwt) {
        User user = getOrCreateUser(jwt);
        List<Mindmap> mindmaps = mindmapRepository.findAllByUserOrderByUpdatedAtDesc(user);
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
        Mindmap mindmap = mindmapRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Mindmap not found"));
        if (!mindmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Forbidden");
        }
        List<Node> nodes = nodeRepository.findByMindmap(mindmap);
        MindmapDto.MindmapFullDto full = new MindmapDto.MindmapFullDto();
        full.id = mindmap.getId();
        full.name = mindmap.getName();
        full.nodes = nodes.stream().map(this::toDto).collect(Collectors.toList());
        return full;
    }

    private MindmapDto.NodeDto toDto(Node n) {
        MindmapDto.NodeDto nodeDto = new MindmapDto.NodeDto();
        nodeDto.id = n.getId();
        nodeDto.parentId = n.getParent() != null ? n.getParent().getId() : null;
        nodeDto.content = n.getContent();
        nodeDto.positionX = n.getPositionX();
        nodeDto.positionY = n.getPositionY();
        nodeDto.radius = n.getRadius();
        return nodeDto;
    }

    @Transactional
    public MindmapDto.UpdateResponse updateMindmap(Jwt jwt, Long id, MindmapDto.UpdateRequest req) {
        User user = getOrCreateUser(jwt);
        Mindmap mindmap = mindmapRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Mindmap not found"));
        if (!mindmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Forbidden");
        }

        if (req.name != null && !req.name.isBlank()) {
            mindmap.setName(req.name.trim());
        }

        // If nodes payload provided, perform full sync (upsert + delete removed)
        if (req.nodes != null) {
            // Load existing nodes once
            List<Node> existingNodes = nodeRepository.findByMindmap(mindmap);
            Map<Long, Node> existingMap = existingNodes.stream()
                    .filter(n -> n.getId() != null)
                    .collect(Collectors.toMap(Node::getId, n -> n));

            Long rootId = mindmap.getRootNode() != null ? mindmap.getRootNode().getId() : null;

            // Collect requested IDs (ignore null -> new)
            Set<Long> requestedIds = req.nodes.stream()
                    .filter(d -> d.id != null)
                    .map(d -> d.id)
                    .collect(Collectors.toSet());

            // Delete nodes that are not in requestedIds and are not root
            for (Node existing : existingNodes) {
                if (existing.getId() != null && !Objects.equals(existing.getId(), rootId) && !requestedIds.contains(existing.getId())) {
                    nodeRepository.delete(existing);
                }
            }

            // First pass: create or update nodes without setting parent to avoid missing references
            Map<Long, Long> pendingParent = new HashMap<>();
            for (MindmapDto.NodeDto dto : req.nodes) {
                Node node;
                if (dto.id != null) {
                    node = existingMap.get(dto.id);
                    if (node == null) {
                        // Ignore unknown id to prevent attaching foreign node
                        continue;
                    }
                } else {
                    node = new Node();
                    node.setMindmap(mindmap);
                }
                if (dto.content != null) node.setContent(dto.content);
                if (dto.positionX != null) node.setPositionX(dto.positionX);
                if (dto.positionY != null) node.setPositionY(dto.positionY);
                if (dto.radius != null) node.setRadius(dto.radius);
                Node saved = nodeRepository.save(node);
                if (dto.id == null) { // newly created assign id back for parent linkage second pass
                    dto.id = saved.getId();
                }
                pendingParent.put(dto.id, dto.parentId); // may be null
                existingMap.put(saved.getId(), saved);
            }

            // Second pass: set parent references
            for (Map.Entry<Long, Long> e : pendingParent.entrySet()) {
                Long childId = e.getKey();
                Long parentId = e.getValue();
                Node child = existingMap.get(childId);
                if (child == null) continue;
                if (parentId == null || Objects.equals(childId, parentId)) {
                    child.setParent(null);
                } else {
                    Node parent = existingMap.get(parentId);
                    if (parent != null && Objects.equals(parent.getMindmap().getId(), mindmap.getId())) {
                        child.setParent(parent);
                    } else {
                        child.setParent(null); // fallback safety
                    }
                }
                nodeRepository.save(child);
            }
        }

        mindmap.preUpdate();
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
        Mindmap mindmap = mindmapRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Mindmap not found"));
        if (!mindmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Forbidden");
        }

        nodeRepository.deleteByMindmap(mindmap);
        mindmapRepository.delete(mindmap);
    }
}