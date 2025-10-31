// Định nghĩa các kiểu dữ liệu dùng chung trong toàn ứng dụng, dựa trên schema BE

/**
 * Định nghĩa style cho một node.
 * Đây là các thuộc tính GHI ĐÈ. Style chính sẽ được tính toán theo level.
 */
export type NodeStyle = {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fontSize?: number;
    fontWeight?: "bold" | "normal";
    textColor?: string;
    shape?: "ellipse" | "rectangle";
};

/**
 * Kiểu dữ liệu cho một Node trong store Frontend.
 * Bao gồm dữ liệu từ BE và các thuộc tính UI.
 */
export type NodeData = {
    // --- Dữ liệu từ Backend ---
    id: string;        // ID (e.g., "root", "uuid-1234")
    text: string;      // Nội dung văn bản
    x: number;         // Tọa độ X
    y: number;         // Tọa độ Y
    parentId?: string; // ID của node cha
    style?: NodeStyle; // Style ghi đè (optional)

    // --- Thuộc tính chỉ có ở Frontend (tính toán hoặc UI state) ---
    level?: number;    // Cấp độ của node (tính toán khi render)
    collapsed?: boolean; // Trạng thái đóng/mở
    width?: number;    // Chiều rộng tính toán (để vẽ đường nối)
    height?: number;   // Chiều cao tính toán (để vẽ đường nối)
};

/**
 * Kiểu dữ liệu cho một Edge (đường nối)
 */
export type EdgeData = {
    id?: string; // ID của đường nối (fe-generated)
    from: string; // ID node bắt đầu
    to: string;   // ID node kết thúc
};

/**
 * Cấu trúc `content` của mindmap, tuân thủ BE (nodes là List)
 */
export type MindmapContent = {
    nodes: NodeData[];
    edges: EdgeData[];
    theme?: { [key: string]: any }; // Chi tiết theme (nếu có)
};

/**
 * Kiểu dữ liệu trả về từ BE cho API /api/mindmaps/{id}
 * (Dùng trong EditorPage.tsx)
 */
export type MindmapDetailResponse = {
    id: string;
    name: string;
    ownerId: string;
    content: MindmapContent; // Đảm bảo content.nodes là List
    updatedAt: string; // ISO String
    createdAt: string; // ISO String
    tags?: string[];
    accessSettings: { isPublic: boolean; publicAccessLevel: string };
    collaborators?: Array<{
        userId: string;
        displayName?: string;
        avatarUrl?: string;
        permission: 'OWNER' | 'EDITOR' | 'VIEWER';
        status?: 'PENDING' | 'ACCEPTED' | 'REJECTED'; // Thêm status cho đủ
    }>;
    workspaceId?: string | null;
    lastEditedBy?: string;
    version?: number; // Quan trọng cho optimistic locking
};

/**
 * Kiểu dữ liệu trả về từ BE cho API /api/mindmaps
 * (Dùng trong Dashboard store)
 */
export type MindmapSummary = {
    id: string;
    name: string;
    ownerId: string;
    updatedAt: string; // ISO String
    createdAt: string; // ISO String
    tags?: string[];
    accessSettings: { isPublic: boolean; publicAccessLevel: 'VIEW' | 'DISABLED' };
};
