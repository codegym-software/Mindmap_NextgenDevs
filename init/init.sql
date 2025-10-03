-- Tạo database
CREATE DATABASE IF NOT EXISTS mindmap_db;
USE mindmap_db;

-- ========================
-- Bảng Users
-- ========================
CREATE TABLE IF NOT EXISTS users (
                                     id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                     email VARCHAR(255) UNIQUE NOT NULL,
                                    cognito_username VARCHAR(36) UNIQUE NOT NULL,
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- Bảng Mindmaps
-- ========================
CREATE TABLE IF NOT EXISTS mindmaps (
                                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                        user_id BIGINT NOT NULL, -- chủ sở hữu chính (owner)
                                        name VARCHAR(255) NOT NULL,
                                        is_public BOOLEAN DEFAULT FALSE, -- nếu muốn chia sẻ công khai
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                        INDEX idx_user_id (user_id)
);

-- ========================
-- Bảng Nodes (các nút trong mindmap)
-- ========================
CREATE TABLE IF NOT EXISTS nodes (
                                     id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                     mindmap_id BIGINT NOT NULL,
                                     parent_id BIGINT NULL,
                                     content TEXT NOT NULL,
                                     position_x DOUBLE DEFAULT 0.0,
                                     position_y DOUBLE DEFAULT 0.0,
                                     radius INT DEFAULT 50,
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                     FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
                                    FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE,
                                    INDEX idx_mindmap_id (mindmap_id),
                                    INDEX idx_parent_id (parent_id)
);






-- ========================
-- Bảng Mindmap_Shares (chia sẻ mindmap cho nhiều user)
-- ========================
CREATE TABLE IF NOT EXISTS mindmap_shares (
                                              id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                              mindmap_id BIGINT NOT NULL,
                                              user_id BIGINT NOT NULL,
                                              role ENUM('viewer', 'editor') DEFAULT 'viewer',
                                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                            FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
                                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                            UNIQUE (mindmap_id, user_id) -- tránh trùng record
    );