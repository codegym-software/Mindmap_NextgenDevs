package com.example.mindmap.features.mindmap.content;

import lombok.Data;

@Data
public class GlobalSettings {
    private String fontFamily;
    private Integer branchLineWidth;
    private Boolean isColoredBranch;
    private String globalBranchColor;
    private String backgroundColor;
    private String activeColorThemeId;
}