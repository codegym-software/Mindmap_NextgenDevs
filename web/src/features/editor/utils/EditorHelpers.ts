import { NodeData, EdgeData, NodeData as FeNodeData } from '../../../app/store/useEditorStore';
import {
  BeMindmapContent,
  normalizeContentBEtoFE,
  normalizeContentFEtoBE,
} from '../../../services/dataMapper';

// =================================================================================
// CONSTANTS
// =================================================================================
export const GUEST_BUCKET = 'mm_guest_docs';
export const PADDING_X = 20;
export const PADDING_Y = 12;
export const LINE_HEIGHT_MULTIPLIER = 1.3;

export const BRANCH_COLORS_PALETTE = [
  '#EF4444', '#F97316', '#FACC15', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
];

// =================================================================================
// TYPES
// =================================================================================
type BeGuestDoc = {
  id: string;
  name: string;
  content: BeMindmapContent;
};

// =================================================================================
// COLOR UTILITIES (Giữ nguyên logic pha màu)
// =================================================================================
export function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

export function mixWithWhite(hex: string, amount = 0.85) {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return rgbToHex(nr, ng, nb);
}

export function getContrastColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#000000' : '#FFFFFF';
}

// =================================================================================
// STORAGE UTILITIES (Guest Logic)
// =================================================================================
export function loadGuestDoc(id: string) {
  try {
    const raw = localStorage.getItem(GUEST_BUCKET);
    if (!raw) return null;
    const allDocs = JSON.parse(raw);
    const beDoc: BeGuestDoc = allDocs[id];
    if (!beDoc) return null;
    const feContent = normalizeContentBEtoFE(beDoc.content);
    return {
      id: beDoc.id,
      name: beDoc.name,
      ...feContent,
      ownerId: 'guest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 0,
    };
  } catch (e) {
    console.error('Error loading guest doc:', e);
    return null;
  }
}

export function saveGuestDoc(
  id: string,
  name: string,
  feNodes: FeNodeData[],
  feEdges: EdgeData[]
) {
  try {
    const beContent = normalizeContentFEtoBE(feNodes, feEdges);
    const all = JSON.parse(localStorage.getItem(GUEST_BUCKET) || '{}');
    const beDoc: BeGuestDoc = { id: id, name: name, content: beContent };
    all[id] = beDoc;
    localStorage.setItem(GUEST_BUCKET, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving guest doc:', e);
  }
}

// =================================================================================
// LAYOUT CALCULATION (Logic tính toán kích thước node)
// =================================================================================
export function calculateNodeBox(node: NodeData, style: NodeData) {
  const { fontSize, nodeLength, nodeText, textCase } = style;
  const borderWidth = style.borderWidth || 0;
  let processedText = nodeText || '';
  if (textCase === 'uppercase') processedText = processedText.toUpperCase();
  if (textCase === 'lowercase') processedText = processedText.toLowerCase();
  const finalFontSize = fontSize || 14;
  const finalLineHeight = finalFontSize * LINE_HEIGHT_MULTIPLIER;
  let w: number;
  let wrappedLines: string[] = [];
  
  // Canvas ảo để đo kích thước text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context) {
    context.font = `${finalFontSize}px ${style.fontFamily || 'Inter'}`;
  }
  const measureWidth = (text: string) =>
    context?.measureText(text).width || text.length * finalFontSize * 0.6;

  if (nodeLength === 'fit') {
    let maxWidth = 0;
    processedText.split('\n').forEach((line: string) => {
      maxWidth = Math.max(maxWidth, measureWidth(line));
    });
    w = maxWidth + PADDING_X * 2 + borderWidth * 2;
    w = Math.max(w, 80);
    wrappedLines = processedText.split('\n');
  } else {
    w = Number(nodeLength) || 150;
    const contentWidth = w - PADDING_X * 2 - borderWidth * 2;
    const lines = processedText.split('\n');
    lines.forEach((line: string) => {
      if (line.length === 0) {
        wrappedLines.push('');
        return;
      }
      let currentLine = '';
      const words = line.split(' ');
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = measureWidth(testLine);
        if (testWidth > contentWidth) {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = word;
          while (measureWidth(currentLine) > contentWidth) {
            wrappedLines.push(currentLine.substring(0, 20));
            currentLine = currentLine.substring(20);
          }
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) wrappedLines.push(currentLine);
    });
  }
  let h = Math.max(
    finalLineHeight + PADDING_Y * 2,
    wrappedLines.length * finalLineHeight + PADDING_Y * 2
  );

  return { w, h, textToRender: wrappedLines.join('\n'), finalFontSize };
}