// src/main/java/com/example/mindmap/features/mindmap/content/NodeStyle.java

package com.example.mindmap.features.mindmap.content;

import com.fasterxml.jackson.annotation.JsonFormat;

public class NodeStyle {
    private String color;
    private String font;
    private Boolean isBold = false;
    private Boolean isItalic = false;
    private TextAlign textAlign = TextAlign.CENTER;
    private String shape;
    private String borderColor;
    private Integer borderWidth;
    private String borderStyle;
    private String imageUrl;
    private Double imageWidth;
    private Double imageHeight;
    private String fontFamily;
    private Integer fontSize;
    private String fontWeight;
    private String fontStyle;
    private String textDecoration;
    private String textColor;
    private String textCase;
    private String backgroundColor;
    private String branchColor;
    private String branchLineStyle;
    private String branchLineEnd;
    private String branchLineThickness;
    private String quickStyleId;
    private String nodeLength;
    private String localStructure;
    private Boolean styleLocked;

    // Getters and Setters
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    
    public String getFont() { return font; }
    public void setFont(String font) { this.font = font; }
    
    public Boolean getIsBold() { return isBold; }
    public void setIsBold(Boolean isBold) { this.isBold = isBold; }
    
    public Boolean getIsItalic() { return isItalic; }
    public void setIsItalic(Boolean isItalic) { this.isItalic = isItalic; }
    
    public TextAlign getTextAlign() { return textAlign; }
    public void setTextAlign(TextAlign textAlign) { this.textAlign = textAlign; }
    
    public String getShape() { return shape; }
    public void setShape(String shape) { this.shape = shape; }
    
    public String getBorderColor() { return borderColor; }
    public void setBorderColor(String borderColor) { this.borderColor = borderColor; }
    
    public Integer getBorderWidth() { return borderWidth; }
    public void setBorderWidth(Integer borderWidth) { this.borderWidth = borderWidth; }
    
    public String getBorderStyle() { return borderStyle; }
    public void setBorderStyle(String borderStyle) { this.borderStyle = borderStyle; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public Double getImageWidth() { return imageWidth; }
    public void setImageWidth(Double imageWidth) { this.imageWidth = imageWidth; }
    
    public Double getImageHeight() { return imageHeight; }
    public void setImageHeight(Double imageHeight) { this.imageHeight = imageHeight; }
    
    public String getFontFamily() { return fontFamily; }
    public void setFontFamily(String fontFamily) { this.fontFamily = fontFamily; }
    
    public Integer getFontSize() { return fontSize; }
    public void setFontSize(Integer fontSize) { this.fontSize = fontSize; }
    
    public String getFontWeight() { return fontWeight; }
    public void setFontWeight(String fontWeight) { this.fontWeight = fontWeight; }
    
    public String getFontStyle() { return fontStyle; }
    public void setFontStyle(String fontStyle) { this.fontStyle = fontStyle; }
    
    public String getTextDecoration() { return textDecoration; }
    public void setTextDecoration(String textDecoration) { this.textDecoration = textDecoration; }
    
    public String getTextColor() { return textColor; }
    public void setTextColor(String textColor) { this.textColor = textColor; }
    
    public String getTextCase() { return textCase; }
    public void setTextCase(String textCase) { this.textCase = textCase; }
    
    public String getBackgroundColor() { return backgroundColor; }
    public void setBackgroundColor(String backgroundColor) { this.backgroundColor = backgroundColor; }
    
    public String getBranchColor() { return branchColor; }
    public void setBranchColor(String branchColor) { this.branchColor = branchColor; }
    
    public String getBranchLineStyle() { return branchLineStyle; }
    public void setBranchLineStyle(String branchLineStyle) { this.branchLineStyle = branchLineStyle; }
    
    public String getBranchLineEnd() { return branchLineEnd; }
    public void setBranchLineEnd(String branchLineEnd) { this.branchLineEnd = branchLineEnd; }
    
    public String getBranchLineThickness() { return branchLineThickness; }
    public void setBranchLineThickness(String branchLineThickness) { this.branchLineThickness = branchLineThickness; }
    
    public String getQuickStyleId() { return quickStyleId; }
    public void setQuickStyleId(String quickStyleId) { this.quickStyleId = quickStyleId; }
    
    public String getNodeLength() { return nodeLength; }
    public void setNodeLength(String nodeLength) { this.nodeLength = nodeLength; }
    
    public String getLocalStructure() { return localStructure; }
    public void setLocalStructure(String localStructure) { this.localStructure = localStructure; }
    
    public Boolean getStyleLocked() { return styleLocked; }
    public void setStyleLocked(Boolean styleLocked) { this.styleLocked = styleLocked; }

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    public enum TextAlign {
        LEFT, CENTER, RIGHT, JUSTIFY
    }
}
