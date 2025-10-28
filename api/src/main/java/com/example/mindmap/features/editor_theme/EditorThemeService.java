package com.example.mindmap.features.editor_theme;

import com.example.mindmap.core.auth.AuthUtils;
import com.example.mindmap.core.exception.ResourceNotFoundException;
import com.example.mindmap.features.editor_theme.dto.EditorThemeDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class EditorThemeService {

    private final EditorThemeRepository editorThemeRepository;
    private final AuthUtils authUtils;

    public EditorThemeService(EditorThemeRepository editorThemeRepository, AuthUtils authUtils) {
        this.editorThemeRepository = editorThemeRepository;
        this.authUtils = authUtils;
    }

    /**
     * Lấy tất cả các theme hệ thống VÀ theme của người dùng hiện tại
     */
    @Transactional(readOnly = true)
    public List<EditorThemeDto> getAvailableThemesForCurrentUser() {
        String currentUserId = authUtils.getRequiredCurrentUserId();

        List<EditorTheme> systemThemes = editorThemeRepository.findByIsSystemTheme(true);
        List<EditorTheme> userThemes = editorThemeRepository.findByCreatedBy(currentUserId);

        return Stream.concat(systemThemes.stream(), userThemes.stream())
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Lấy một theme cụ thể bằng ID
     */
    @Transactional(readOnly = true)
    public EditorThemeDto getThemeById(String id) {
        EditorTheme theme = editorThemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EditorTheme", "id", id));

        // TODO: Thêm logic kiểm tra quyền:
        // Hoặc là theme hệ thống, hoặc là do người dùng tạo
        // if (!theme.isSystemTheme() && !theme.getCreatedBy().equals(authUtils.getRequiredCurrentUserId())) {
        //    throw new AccessDeniedException("You do not have permission to view this theme.");
        // }

        return mapToDto(theme);
    }

    // (Các phương thức Create, Update, Delete có thể được thêm vào sau)

    /**
     * Hàm helper để chuyển đổi Entity (Model) sang DTO
     */
    private EditorThemeDto mapToDto(EditorTheme theme) {
        return new EditorThemeDto(
                theme.getId(),
                theme.getName(),
                theme.getDescription(),
                theme.getConfig(),
                theme.isSystemTheme(),
                theme.getCreatedBy()
        );
    }
}
