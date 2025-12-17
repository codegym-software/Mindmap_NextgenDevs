// src/main/java/com/example/mindmap/features/mindmap/content/EdgeData.java
package com.example.mindmap.features.mindmap.content;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class EdgeData {
    private String id;
    private String from;
    private String to;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }

    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }
}
