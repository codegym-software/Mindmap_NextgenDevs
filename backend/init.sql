CREATE DATABASE IF NOT EXISTS mindmap_db;
USE mindmap_db;

CREATE TABLE IF NOT EXISTS users (
                                     id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                     email VARCHAR(255) UNIQUE NOT NULL,
                                     password_hash VARCHAR(255) NOT NULL,
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nodes (
                                     id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                     mindmap_id BIGINT NOT NULL,
                                     parent_id BIGINT,
                                     content TEXT,
                                     position_x DOUBLE DEFAULT 0.0,
                                     position_y DOUBLE DEFAULT 0.0,
                                     radius INT DEFAULT 50,
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                     INDEX idx_mindmap_id (mindmap_id),
                                     INDEX idx_parent_id (parent_id),
                                     FOREIGN KEY (parent_id) REFERENCES nodes(id)
);

CREATE INDEX idx_nodes_id ON nodes(id);

CREATE TABLE IF NOT EXISTS mindmaps (
                                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                        user_id BIGINT NOT NULL,
                                        name VARCHAR(255) NOT NULL,
                                        root_node_id BIGINT,
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                        INDEX idx_user_id (user_id),
                                        INDEX idx_root_node_id (root_node_id),
                                        FOREIGN KEY (user_id) REFERENCES users(id),
                                        FOREIGN KEY (root_node_id) REFERENCES nodes(id)
);
