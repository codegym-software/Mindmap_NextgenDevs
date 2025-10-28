package com.example.mindmap.features.editor_theme;

import com.example.mindmap.features.editor_theme.dto.EditorThemeDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/editor-themes")
public class EditorThemeController {

    private final EditorThemeService editorThemeService;

    public EditorThemeController(EditorThemeService editorThemeService) {
        this.editorThemeService = editorThemeService;
    }

    /**
     * Lấy danh sách các theme có sẵn cho người dùng (system themes + user's custom themes)
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EditorThemeDto>> getAvailableThemes() {
        return ResponseEntity.ok(editorThemeService.getAvailableThemesForCurrentUser());
    }

    /**
     * Lấy chi tiết một theme bằng ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EditorThemeDto> getThemeById(@PathVariable String id) {
        return ResponseEntity.ok(editorThemeService.getThemeById(id));
    }

    // (Các endpoint POST, PUT, DELETE để tạo/cập nhật theme có thể thêm sau)
}
