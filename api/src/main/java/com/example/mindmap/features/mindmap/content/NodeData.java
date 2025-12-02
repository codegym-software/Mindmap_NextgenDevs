package com.example.mindmap.features.mindmap.content;

public class NodeData {
    private String id;
    private String text;
    private double x;
    private double y;
    private String parentId;
    private NodeStyle style = new NodeStyle();
    private boolean isCollapsed = false;
    private String hyperlink;
    private String notes;
    private Object externalReference;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    
    public double getX() { return x; }
    public void setX(double x) { this.x = x; }
    
    public double getY() { return y; }
    public void setY(double y) { this.y = y; }
    
    public String getParentId() { return parentId; }
    public void setParentId(String parentId) { this.parentId = parentId; }
    
    public NodeStyle getStyle() { return style; }
    public void setStyle(NodeStyle style) { this.style = style; }
    
    public boolean isCollapsed() { return isCollapsed; }
    public void setCollapsed(boolean collapsed) { isCollapsed = collapsed; }
    
    public String getHyperlink() { return hyperlink; }
    public void setHyperlink(String hyperlink) { this.hyperlink = hyperlink; }
    
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    
    public Object getExternalReference() { return externalReference; }
    public void setExternalReference(Object externalReference) { this.externalReference = externalReference; }
}