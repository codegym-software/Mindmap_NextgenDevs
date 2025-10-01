package com.example.backend.service;

import com.example.backend.dto.NodeDto;
import com.example.backend.model.Mindmap;
import com.example.backend.model.Node;
import com.example.backend.model.User;
import com.example.backend.repository.MindmapRepository;
import com.example.backend.repository.NodeRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NodeService {
    private final MindmapRepository mindmapRepository;
    private final NodeRepository nodeRepository;
    private final UserRepository userRepository;

    public NodeService(MindmapRepository mindmapRepository, NodeRepository nodeRepository, UserRepository userRepository) {
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
        if (existing != null) return existing;
        User user = new User();
        user.setCognitoUsername(sub);
        user.setEmail(email != null && !email.isBlank() ? email : ("user-" + sub));
        user.setCreatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    private Mindmap requireOwnedMindmap(User user, Long mindmapId) {
        Mindmap m = mindmapRepository.findById(mindmapId)
                .orElseThrow(() -> new IllegalArgumentException("Mindmap not found"));
        if (!m.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Forbidden");
        }
        return m;
    }

    @Transactional(readOnly = true)
    public List<NodeDto> list(Jwt jwt, Long mindmapId) {
        User user = getOrCreateUser(jwt);
        Mindmap mindmap = requireOwnedMindmap(user, mindmapId);
        return nodeRepository.findByMindmap(mindmap).stream()
                .map(n -> NodeDto.of(mindmapId, n))
                .collect(Collectors.toList());
    }

    @Transactional
    public NodeDto create(Jwt jwt, Long mindmapId, NodeDto.CreateRequest req) {
        User user = getOrCreateUser(jwt);
        Mindmap mindmap = requireOwnedMindmap(user, mindmapId);
        Node node = new Node();
        node.setMindmap(mindmap);
        node.setContent(req.content == null ? "" : req.content);
        if (req.positionX != null) node.setPositionX(req.positionX);
        if (req.positionY != null) node.setPositionY(req.positionY);
        if (req.radius != null) node.setRadius(req.radius);
        if (req.parentId != null) {
            Node parent = nodeRepository.findByIdAndMindmap_Id(req.parentId, mindmapId)
                    .orElseThrow(() -> new IllegalArgumentException("Parent node not found"));
            node.setParent(parent);
        }
        Node saved = nodeRepository.save(node);
        return NodeDto.of(mindmapId, saved);
    }

    @Transactional
    public NodeDto update(Jwt jwt, Long mindmapId, Long nodeId, NodeDto.UpdateRequest req) {
        User user = getOrCreateUser(jwt);
        requireOwnedMindmap(user, mindmapId);
        Node node = nodeRepository.findByIdAndMindmap_Id(nodeId, mindmapId)
                .orElseThrow(() -> new IllegalArgumentException("Node not found"));
        if (req.content != null) node.setContent(req.content);
        if (req.positionX != null) node.setPositionX(req.positionX);
        if (req.positionY != null) node.setPositionY(req.positionY);
        if (req.radius != null) node.setRadius(req.radius);
        if (req.parentId != null && !req.parentId.equals(nodeId)) {
            Node parent = nodeRepository.findByIdAndMindmap_Id(req.parentId, mindmapId)
                    .orElseThrow(() -> new IllegalArgumentException("Parent node not found"));
            node.setParent(parent);
        }
        Node saved = nodeRepository.save(node);
        return NodeDto.of(mindmapId, saved);
    }

    @Transactional
    public void delete(Jwt jwt, Long mindmapId, Long nodeId) {
        User user = getOrCreateUser(jwt);
        requireOwnedMindmap(user, mindmapId);
        Node node = nodeRepository.findByIdAndMindmap_Id(nodeId, mindmapId)
                .orElseThrow(() -> new IllegalArgumentException("Node not found"));
        Mindmap mindmap = node.getMindmap();
        if (mindmap.getRootNode() != null && mindmap.getRootNode().getId().equals(node.getId())) {
            throw new IllegalArgumentException("Cannot delete root node");
        }
        nodeRepository.delete(node);
    }
}

