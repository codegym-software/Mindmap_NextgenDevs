package com.example.mindmap.features.mindmap.content;

import java.util.List;
import java.util.ArrayList;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public class MindmapContent {
    private String layoutMode = "FREEFORM";
    private List<NodeData> nodes = new ArrayList<>();
    private List<EdgeData> edges = new ArrayList<>();
    private MindmapTheme theme = MindmapTheme.LIGHT;
    private GlobalSettings globalSettings = new GlobalSettings();
    
    // [NEW] Thêm relationships và summaries
    private List<Object> relationships = new ArrayList<>(); // Dùng Object để linh hoạt
    private List<Object> summaries = new ArrayList<>();     // Dùng Object để linh hoạt

    // Getters and Setters
    public String getLayoutMode() { return layoutMode; }
    public void setLayoutMode(String layoutMode) { this.layoutMode = layoutMode; }
    
    public List<NodeData> getNodes() { return nodes; }
    public void setNodes(List<NodeData> nodes) { this.nodes = nodes; }
    
    public List<EdgeData> getEdges() { return edges; }
    public void setEdges(List<EdgeData> edges) { this.edges = edges; }
    
    public MindmapTheme getTheme() { return theme; }
    public void setTheme(MindmapTheme theme) { this.theme = theme; }
    
    public GlobalSettings getGlobalSettings() { return globalSettings; }
    public void setGlobalSettings(GlobalSettings globalSettings) { this.globalSettings = globalSettings; }
    
    // [NEW] Getters and Setters cho relationships và summaries
    public List<Object> getRelationships() { return relationships; }
    public void setRelationships(List<Object> relationships) { this.relationships = relationships; }
    
    public List<Object> getSummaries() { return summaries; }
    public void setSummaries(List<Object> summaries) { this.summaries = summaries; }

    public static class GlobalSettings {
        private String fontFamily;
        private Integer branchLineWidth;
        private Boolean isColoredBranch;
        private String globalBranchColor;
        private String backgroundColor;
        private String activeColorThemeId;

        public String getFontFamily() { return fontFamily; }
        public void setFontFamily(String fontFamily) { this.fontFamily = fontFamily; }
        
        public Integer getBranchLineWidth() { return branchLineWidth; }
        public void setBranchLineWidth(Integer branchLineWidth) { this.branchLineWidth = branchLineWidth; }
        
        public Boolean getIsColoredBranch() { return isColoredBranch; }
        public void setIsColoredBranch(Boolean isColoredBranch) { this.isColoredBranch = isColoredBranch; }
        
        public String getGlobalBranchColor() { return globalBranchColor; }
        public void setGlobalBranchColor(String globalBranchColor) { this.globalBranchColor = globalBranchColor; }
        
        public String getBackgroundColor() { return backgroundColor; }
        public void setBackgroundColor(String backgroundColor) { this.backgroundColor = backgroundColor; }
        
        public String getActiveColorThemeId() { return activeColorThemeId; }
        public void setActiveColorThemeId(String activeColorThemeId) { this.activeColorThemeId = activeColorThemeId; }
    }

    public enum MindmapTheme {
        LIGHT, DARK;

        @JsonCreator
        public static MindmapTheme from(String value) {
            return MindmapTheme.valueOf(value.toUpperCase());
        }

        @JsonValue
        public String toValue() {
            return this.name().toLowerCase();
        }
    }
}
