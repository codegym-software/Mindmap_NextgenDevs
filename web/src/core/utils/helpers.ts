/**
 * Chứa các hàm helper để tính toán style và kích thước node.
 * Tuân thủ yêu cầu: Tính level, Áp style, Tự động xuống dòng.
 */
import { NodeData } from '../types';
import { NodeStyle } from '../types'; // Import NodeStyle

// --- Styling Configuration (Theo yêu cầu: cấp node, màu, viền, kiểu chữ) ---
// (Sử dụng lại style từ code gốc bạn cung cấp)
const levelStyles: (Omit<NodeStyle, 'fontSize'> & { fontSize: number })[] = [
    // Level 0 (Root) (User Story #9)
    { bg: "#4CAF50", border: 3, fontSize: 18, fontWeight: "bold", shape: "ellipse", backgroundColor: "#4CAF50", borderColor: "#388E3C", borderWidth: 3, textColor: "#FFFFFF" },
    // Level 1
    { bg: "#2196F3", border: 2, fontSize: 16, fontWeight: "normal", shape: "rectangle", backgroundColor: "#2196F3", borderColor: "#1976D2", borderWidth: 2, textColor: "#FFFFFF" },
    // Level 2
    { bg: "#FF9800", border: 1, fontSize: 14, fontWeight: "normal", shape: "rectangle", backgroundColor: "#FF9800", borderColor: "#F57C00", borderWidth: 1, textColor: "#FFFFFF" },
    // Level 3+ (Default)
    { bg: "#9E9E9E", border: 1, fontSize: 14, fontWeight: "normal", shape: "rectangle", backgroundColor: "#9E9E9E", borderColor: "#616161", borderWidth: 1, textColor: "#FFFFFF" },
];

/**
 * Lấy style (màu, viền, font) dựa trên cấp độ (level) của node.
 * Tuân thủ yêu cầu: "Frontend tính level khi render", "Áp dụng style theo level".
 */
export const getNodeStyle = (level: number): typeof levelStyles[0] => {
    return levelStyles[Math.min(level, levelStyles.length - 1)] || levelStyles[levelStyles.length - 1];
};

/**
 * Tính toán cấp độ (level) của một node bằng cách đệ quy tra parentId.
 * Tuân thủ yêu cầu: "Frontend tính level từ parentId".
 */
export const calculateLevel = (nodeId: string | undefined, nodeMap: Map<string, NodeData>): number => {
    if (!nodeId) return 0;
    let level = 0;
    let current = nodeMap.get(nodeId);
    while (current?.parentId && nodeMap.has(current.parentId) && level < 50) { // Safety break
        level++;
        current = nodeMap.get(current.parentId);
    }
    return level;
};

// --- Text Measurement & Wrapping Constants (Hỗ trợ User Story #34) ---
// (Sử dụng lại hằng số từ code gốc `Editor.tsx` của bạn)
const PADDING_X = 20;
const PADDING_Y = 12;
const LINE_HEIGHT_MULTIPLIER = 1.3;
const NODE_WIDTH_CHARS = 25;
const APPROX_CHAR_WIDTH = 8;
const MIN_NODE_WIDTH = (NODE_WIDTH_CHARS * APPROX_CHAR_WIDTH) + PADDING_X * 2;

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}


/**
 * Tính toán kích thước (width, height) của node và xử lý ngắt dòng văn bản.
 * Tuân thủ yêu cầu: "Tự động xuống dòng khi nhập dữ liệu".
 * (Sử dụng lại logic từ `getNodeBox` trong code gốc `Editor.tsx`)
 */
export const calculateNodeDimensions = (text: string, style: ReturnType<typeof getNodeStyle>) => {
    const finalFontSize = style.fontSize;
    const finalLineHeight = finalFontSize * LINE_HEIGHT_MULTIPLIER;
    const minHeight = finalFontSize * LINE_HEIGHT_MULTIPLIER + PADDING_Y * 2;
    const nodeWidthChars = (style.shape === 'ellipse') ? NODE_WIDTH_CHARS + 5 : NODE_WIDTH_CHARS;
    const minWidth = (nodeWidthChars * APPROX_CHAR_WIDTH) + PADDING_X * 2;
   
    const lines = (text || "").split("\n");
    const wrappedLines: string[] = [];
    // Logic word wrap (từ code gốc của bạn)
    lines.forEach(line => {
        if (line.length <= nodeWidthChars) {
            wrappedLines.push(line);
        } else {
            let currentLine = "";
            const words = line.split(' ');
            for (const word of words) {
                if (word.length > nodeWidthChars) { // Từ dài hơn cả dòng
                    if (currentLine) wrappedLines.push(currentLine);
                    wrappedLines.push(word); // Tạm thời cho phép vỡ
                    currentLine = "";
                } else if ((currentLine + " " + word).length > nodeWidthChars) {
                    wrappedLines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine += (currentLine ? " " : "") + word;
                }
            }
            if (currentLine) wrappedLines.push(currentLine);
        }
    });
    if (wrappedLines.length === 0) wrappedLines.push('');
    const width = minWidth; // Chiều rộng cố định
    const height = Math.max(minHeight, wrappedLines.length * finalLineHeight + PADDING_Y * 2);
   
    return {
        width,
        height,
        textToRender: wrappedLines.join("\n"),
        finalFontSize,
    };
};