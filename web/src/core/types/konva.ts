/**
 * Định nghĩa các kiểu (types) và hằng số liên quan đến KonvaJS và logic render.
 * (File này trước đó trống)
 */
import { NodeData, NodeStyle } from ".";

export const PADDING_X = 20;
export const PADDING_Y = 12;
export const LINE_HEIGHT_MULTIPLIER = 1.3;
export const NODE_WIDTH_CHARS = 25;
export const APPROX_CHAR_WIDTH = 8;
export const MIN_NODE_WIDTH = (NODE_WIDTH_CHARS * APPROX_CHAR_WIDTH) + PADDING_X * 2;
export const COLLAPSE_BUTTON_RADIUS = 8;
export const COLLAPSE_BUTTON_OFFSET = 3;

export type LevelStyle = Required<Omit<NodeStyle, 'fontSize' | 'border'>> & {
    fontSize: number;
    border: number;
};

export const levelStyles: LevelStyle[] = [
    {
        shape: "ellipse",
        bg: "#4CAF50",
        border: 3,
        fontSize: 18,
        fontWeight: "bold",
        backgroundColor: "#4CAF50",
        borderColor: "#388E3C",
        borderWidth: 3,
        textColor: "#FFFFFF",
    },
    {
        shape: "rectangle",
        bg: "#2196F3",
        border: 2,
        fontSize: 16,
        fontWeight: "normal",
        backgroundColor: "#2196F3",
        borderColor: "#1976D2",
        borderWidth: 2,
        textColor: "#FFFFFF",
    },
    {
        shape: "rectangle",
        bg: "#FF9800",
        border: 1,
        fontSize: 14,
        fontWeight: "normal",
        backgroundColor: "#FF9800",
        borderColor: "#F57C00",
        borderWidth: 1,
        textColor: "#FFFFFF",
    },
];

export interface CalculatedNodeData extends NodeData {
    level: number;
    style: LevelStyle;
    width: number;
    height: number;
    textToRender: string;
    descendantCount: number;
    hasChildren: boolean;
    finalFontSize: number;
}