package com.example.mindmap.features.collaboration.dto;

import com.example.mindmap.features.collaboration.Permission;

public record RequestAccessRequest(
        Permission requestedPermission // EDITOR hoặc VIEWER
) {}