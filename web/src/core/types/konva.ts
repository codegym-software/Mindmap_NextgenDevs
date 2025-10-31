/**
 * Định nghĩa các kiểu (types) và hằng số liên quan đến KonvaJS và logic render.
 * (File này trước đó trống)
 */

import { NodeData, NodeStyle } from "."; // Import từ `core/types/index.ts`

// --- Hằng số Styling (Tuân thủ yêu cầu style theo level) ---

export const PADDING_X = 16; // Padding ngang trong node
export const PADDING_Y = 10; // Padding dọc trong node
export const LINE_HEIGHT_MULTIPLIER = 1.35; // Chiều cao dòng
export const NODE_WIDTH_CHARS = 22; // Số ký tự tối đa mỗi dòng
export const APPROX_CHAR_WIDTH = 7.8; // Chiều rộng pixel trung bình của 1 ký tự
export const MIN_NODE_WIDTH = (NODE_WIDTH_CHARS * APPROX_CHAR_WIDTH) + PADDING_X * 2;
export const COLLAPSE_BUTTON_SIZE = 16;
export const COLLAPSE_BUTTON_OFFSET = 4;

// --- Kiểu Style theo Level (Tuân thủ yêu cầu) ---

export type LevelStyle = Required<Omit<NodeStyle, 'fontSize'>> & {
    fontSize: number;
};

// Cấu hình style theo level
export const levelStyles: LevelStyle[] = [
    // Level 0 (Root) (User Story #9)
    {
        shape: "ellipse",
        backgroundColor: "#4CAF50", // Green
        borderColor: "#388E3C",
        borderWidth: 2.5,
        fontSize: 16,
        fontWeight: "bold",
        textColor: "#FFFFFF",
    },
    // Level 1
    {
        shape: "rectangle",
        backgroundColor: "#2196F3", // Blue
        borderColor: "#1976D2",
        borderWidth: 2,
        fontSize: 14,
        fontWeight: "normal",
        textColor: "#FFFFFF",
    },
    // Level 2
    {
        shape: "rectangle",
        backgroundColor: "#FF9800", // Orange
        borderColor: "#F57C00",
        borderWidth: 1.5,
        fontSize: 13,
        fontWeight: "normal",
        textColor: "#FFFFFF",
    },
    // Level 3
    {
        shape: "rectangle",
        backgroundColor: "#9C27B0", // Purple
        borderColor: "#7B1FA2",
        borderWidth: 1.5,
        fontSize: 12,
        fontWeight: "normal",
        textColor: "#FFFFFF",
    },
    // Level 4+ (Default)
    {
        shape: "rectangle",
        backgroundColor: "#607D8B", // Blue Grey
        borderColor: "#455A64",
        borderWidth: 1,
        fontSize: 12,
        fontWeight: "normal",
        textColor: "#FFFFFF",
    },
];

// --- Kiểu dữ liệu tiện ích cho Konva ---

/**
 * Gộp NodeData (từ store) và các thuộc tính tính toán (calculated)
 * để truyền xuống component `Node.tsx`.
 */
export interface CalculatedNodeData extends NodeData {
    level: number;
    style: LevelStyle; // Style cuối cùng (đã gộp default + override)
    width: number;
    height: number;
    textToRender: string;
    descendantCount: number;
    hasChildren: boolean;
}
