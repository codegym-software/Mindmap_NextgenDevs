package com.example.mindmap.features.collaboration.dto;

import com.example.mindmap.features.collaboration.Permission;
import jakarta.validation.constraints.NotNull;

public record ApproveAccessRequest(
        @NotNull
        Permission permission // Quyền cấp cho user (thường là quyền họ xin hoặc thấp hơn)
) {}