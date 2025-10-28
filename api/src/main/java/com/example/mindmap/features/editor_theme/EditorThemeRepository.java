package com.example.mindmap.features.editor_theme;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EditorThemeRepository extends MongoRepository<EditorTheme, String> {

    // Tìm các theme hệ thống (dùng chung)
    List<EditorTheme> findByIsSystemTheme(boolean isSystemTheme);

    // Tìm các theme do người dùng cụ thể tạo
    List<EditorTheme> findByCreatedBy(String userId);

    // Tìm theme bằng tên (tên là unique)
    Optional<EditorTheme> findByName(String name);
}
