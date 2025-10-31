import { NodeData } from '../types'; // Import kiểu dữ liệu chung

// --- Styling Configuration (Theo yêu cầu: cấp node, màu, viền, kiểu chữ) ---
const levelStyles = [
    // Level 0 (Root)
    { bg: "#4CAF50", border: "#388E3C", width: 2.5, fontSize: 16, fontWeight: "bold", textColor: "#FFFFFF", shape: "ellipse" },
    // Level 1
    { bg: "#2196F3", border: "#1976D2", width: 2, fontSize: 14, fontWeight: "normal", textColor: "#FFFFFF", shape: "rectangle" },
    // Level 2
    { bg: "#FF9800", border: "#F57C00", width: 1.5, fontSize: 13, fontWeight: "normal", textColor: "#FFFFFF", shape: "rectangle" },
    // Level 3
    { bg: "#9C27B0", border: "#7B1FA2", width: 1.5, fontSize: 12, fontWeight: "normal", textColor: "#FFFFFF", shape: "rectangle" },
    // Level 4+ (Default)
    { bg: "#795548", border: "#5D4037", width: 1, fontSize: 12, fontWeight: "normal", textColor: "#FFFFFF", shape: "rectangle" },
];

/**
 * Lấy style (màu, viền, font) dựa trên cấp độ (level) của node.
 * Tuân thủ yêu cầu: "Frontend tính level khi render", "Áp dụng style theo level".
 */
export const getNodeStyle = (level: number) => {
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
const PADDING_X = 14;
const PADDING_Y = 8;
const LINE_HEIGHT_MULTIPLIER = 1.35;
const NODE_WIDTH_CHARS = 20; // Max characters per line before wrap
const APPROX_CHAR_WIDTH = 7.5;
const MIN_NODE_WIDTH = (NODE_WIDTH_CHARS * APPROX_CHAR_WIDTH) + PADDING_X * 2;

/**
 * Tính toán kích thước (width, height) của node và xử lý ngắt dòng văn bản.
 * Tuân thủ yêu cầu: "Tự động xuống dòng khi nhập dữ liệu".
 */
export const calculateNodeDimensions = (text: string, style: ReturnType<typeof getNodeStyle>) => {
    const lines = (text || "").split("\n");
    const wrappedLines: string[] = [];
    const finalFontSize = style.fontSize;
    const finalLineHeight = finalFontSize * LINE_HEIGHT_MULTIPLIER;

    // Word wrapping logic
    lines.forEach(line => {
        if (line.trim().length === 0) {
            wrappedLines.push(''); return;
        }
        if (line.length <= NODE_WIDTH_CHARS) {
            wrappedLines.push(line);
        } else {
            let currentLine = "";
            const words = line.split(/(\s+)/).filter(Boolean);
            for (const word of words) {
                const potentialLine = currentLine ? currentLine + word : word;
                if (potentialLine.length > NODE_WIDTH_CHARS && currentLine) {
                    wrappedLines.push(currentLine);
                    if (word.trim().length > NODE_WIDTH_CHARS) {
                        let tempWord = word.trim();
                        while(tempWord.length > NODE_WIDTH_CHARS) {
                           wrappedLines.push(tempWord.substring(0, NODE_WIDTH_CHARS));
                           tempWord = tempWord.substring(NODE_WIDTH_CHARS);
                        }
                       currentLine = tempWord;
                    } else {
                       currentLine = word.trimStart();
                    }
                } else if (potentialLine.length > NODE_WIDTH_CHARS && !currentLine) {
                     let tempWord = word.trim();
                     while(tempWord.length > NODE_WIDTH_CHARS) {
                        wrappedLines.push(tempWord.substring(0, NODE_WIDTH_CHARS));
                        tempWord = tempWord.substring(NODE_WIDTH_CHARS);
                     }
                    currentLine = tempWord;
                } else {
                    currentLine = potentialLine;
                }
            }
            if (currentLine) wrappedLines.push(currentLine);
        }
    });

    if (wrappedLines.length === 0) wrappedLines.push('');

    const calculatedHeight = Math.max(
        finalFontSize * LINE_HEIGHT_MULTIPLIER + PADDING_Y * 2,
        wrappedLines.length * finalLineHeight + PADDING_Y * 2
    );
    const calculatedWidth = MIN_NODE_WIDTH;

    return {
        width: calculatedWidth,
        height: calculatedHeight,
        textToRender: wrappedLines.join("\n"),
    };
};
