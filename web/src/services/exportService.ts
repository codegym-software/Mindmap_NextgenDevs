import { jsPDF } from 'jspdf';
import { NodeData, EdgeData } from '../app/store/useEditorStore';

/**
 * Service để xuất Mindmap sang các định dạng khác nhau (Text, PDF, PNG)
 */

// =====================================
// 1. XUẤT SANG TEXT
// =====================================

export function exportAsText(nodes: NodeData[], edges: EdgeData[]): string {
  // Tạo root node từ danh sách nodes
  const rootNode = nodes.find(n => n.id === 'root');
  if (!rootNode) {
    return 'Không tìm thấy node gốc';
  }

  let text = '';
  const visited = new Set<string>();

  // Hàm đệ quy để xây dựng cấu trúc Markdown phân cấp
  function buildTextTree(nodeId: string, level: number = 0): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Định dạng theo cấp độ
    let prefix = '';
    if (level === 0) {
      // Root Node - # Tiêu đề chính
      prefix = '# ';
    } else if (level === 1) {
      // Nhánh cấp 1 - * Nhánh 1
      prefix = '* ';
    } else {
      // Nhánh cấp 2+ - Thụt đầu dòng với * (mỗi cấp thêm 2 spaces)
      const indent = '  '.repeat(level - 1);
      prefix = indent + '* ';
    }

    // Thêm text của node (giữ nguyên emoji và ký tự đặc biệt)
    let nodeContent = node.nodeText;
    
    // Thêm link liên kết nếu có
    if (node.hyperlink && node.hyperlink.trim()) {
      nodeContent += ` [🔗 ${node.hyperlink}]`;
    }
    
    // Thêm thông tin hình ảnh nếu có
    if (node.imageUrl && node.imageUrl.trim()) {
      nodeContent += ` [📷 Hình ảnh]`;
    }
    
    text += prefix + nodeContent + '\n';

    // Nếu node có ghi chú (notes) - hiển thị dưới dạng blockquote
    // TODO: Thêm trường notes vào NodeData interface khi cần
    // if (node.notes && node.notes.trim()) {
    //   const indent = level > 0 ? '  '.repeat(level - 1) : '';
    //   text += indent + '> ' + node.notes + '\n';
    // }

    // Tìm các children của node này
    const children = edges
      .filter(e => e.from === nodeId)
      .map(e => e.to)
      .map(id => nodes.find(n => n.id === id))
      .filter(Boolean) as NodeData[];

    // Sắp xếp: left trước, rồi right
    const leftChildren = children.filter(c => c.side === 'left');
    const rightChildren = children.filter(c => c.side !== 'left');

    [...leftChildren, ...rightChildren].forEach(child => {
      buildTextTree(child.id, level + 1);
    });
  }

  buildTextTree('root');
  return text;
}

// Hàm download text
export function downloadAsText(nodes: NodeData[], edges: EdgeData[], filename: string = 'mindmap.txt'): void {
  const text = exportAsText(nodes, edges);
  const blob = new Blob([text], { type: 'text/plain' });
  downloadBlob(blob, filename);
}

// =====================================
// 2. XUẤT SANG PDF (Đơn giản - Tiếng Việt)
// =====================================
// 3. XUẤT SANG PNG (từ Canvas Konva)
// =====================================

export function downloadAsImagePNG(
  stageRef: any,
  filename: string = 'mindmap.png'
): void {
  if (!stageRef || !stageRef.current) {
    console.error('Stage reference not found');
    return;
  }

  try {
    const stage = stageRef.current;
    // Lấy URL từ canvas
    const dataURL = stage.toDataURL({
      pixelRatio: 2, // Độ phân giải cao hơn
      mimeType: 'image/png'
    });

    const blob = dataURItoBlob(dataURL);
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error exporting as PNG:', error);
  }
}

// =====================================
// 3. XUẤT SANG PDF (Chụp canvas vào PDF)
// =====================================

export function downloadAsPDF(
  stageRef: any,
  filename: string = 'mindmap.pdf'
): void {
  if (!stageRef || !stageRef.current) {
    console.error('Stage reference not found');
    alert('Không thể xuất PDF - tham chiếu Stage không khả dụng');
    return;
  }

  try {
    const stage = stageRef.current;
    const width = stage.width ? stage.width() : 1200;
    const height = stage.height ? stage.height() : 800;
    const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });

    const orientation = width >= height ? 'l' : 'p';
    const doc = new jsPDF({
      orientation,
      unit: 'px',
      format: [width, height]
    });

    doc.addImage(dataURL, 'PNG', 0, 0, width, height, undefined, 'FAST');
    doc.save(filename);
  } catch (error) {
    console.error('Error exporting as PDF:', error);
    alert('Lỗi khi xuất PDF: ' + (error instanceof Error ? error.message : 'Không xác định'));
  }
}

// =====================================
// 4. XUẤT SANG SVG (Layer tách biệt - Editable)
// =====================================

export function downloadAsSVG(nodes: NodeData[], edges: EdgeData[], filename: string = 'mindmap.svg'): void {
  try {
    if (nodes.length === 0) {
      alert('Không có node nào để xuất SVG');
      return;
    }

    // Helper: depth map
    const depthMap = new Map<string, number>();
    depthMap.set('root', 0);
    let changed = true;
    while (changed) {
      changed = false;
      edges.forEach(e => {
        const fromDepth = depthMap.get(e.from);
        if (fromDepth !== undefined && !depthMap.has(e.to)) {
          depthMap.set(e.to, fromDepth + 1);
          changed = true;
        }
      });
    }

    // Branch colors for children of root
    const palette = ['#2563EB', '#DC2626', '#16A34A', '#A855F7', '#F59E0B', '#0EA5E9', '#EF4444', '#10B981'];
    const rootChildren = edges.filter(e => e.from === 'root').map(e => e.to);
    const branchColorMap = new Map<string, string>();
    rootChildren.forEach((id, idx) => branchColorMap.set(id, palette[idx % palette.length]));

    // Propagate branch colors down the tree
    let propagate = true;
    while (propagate) {
      propagate = false;
      edges.forEach(e => {
        const parentColor = branchColorMap.get(e.from);
        if (parentColor && !branchColorMap.has(e.to)) {
          branchColorMap.set(e.to, parentColor);
          propagate = true;
        }
      });
    }

    // Bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    });
    const padding = 80;
    const viewX = minX - padding;
    const viewY = minY - padding;
    const viewWidth = maxX - minX + padding * 2;
    const viewHeight = maxY - minY + padding * 2;

    // Root styling
    const rootBg = '#2563EB';
    const rootTextColor = '#FFFFFF';

    // SVG header with filters (drop shadow) and typography
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}" width="${viewWidth}" height="${viewHeight}">
  <defs>
    <style>
      .node-rect { stroke-linecap: round; stroke-linejoin: round; }
      .node-text { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; text-anchor: middle; dominant-baseline: central; }
      .edge-line { fill: none; stroke-linecap: round; stroke-linejoin: round; }
    </style>
    <filter id="dropshadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.20" />
    </filter>
  </defs>

  <!-- Layer: Edges (Connections) -->
  <g id="edges-layer" class="edges">`;

    // Edges
    edges.forEach((edge, index) => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (fromNode && toNode) {
        const x1 = fromNode.x;
        const y1 = fromNode.y;
        const x2 = toNode.x;
        const y2 = toNode.y;
        const midX = (x1 + x2) / 2;
        const controlY = (y1 + y2) / 2 + (toNode.side === 'left' ? -50 : 50);
        const branchColor = branchColorMap.get(edge.from) || branchColorMap.get(edge.to) || '#94a3b8';
        svg += `\n    <path id="edge-${index}" class="edge-line" stroke="${branchColor}" stroke-width="2.5" d="M ${x1} ${y1} Q ${midX} ${controlY} ${x2} ${y2}" />`;
      }
    });

    svg += '\n  </g>\n\n  <!-- Layer: Node Backgrounds (Rectangles) -->\n  <g id="nodes-bg-layer" class="node-backgrounds">';

    nodes.forEach((node) => {
      const depth = depthMap.get(node.id) ?? 0;
      const isRoot = depth === 0;
      const isLevel1 = depth === 1;
      const scale = isRoot ? 1.3 : isLevel1 ? 1.0 : 0.85;
      const baseWidth = Math.max(100, (node.nodeLength as number || 100));
      const baseHeight = 46;
      const w = (baseWidth * scale) / 2;
      const h = (baseHeight * scale) / 2;

      const branchColor = branchColorMap.get(node.id);
      const color = isRoot ? rootBg : branchColor ? `${branchColor}` : (node.color || '#FFFFFF');
      const borderColor = branchColor ? branchColor : (node.borderColor || '#CBD5E0');
      const borderWidth = isRoot ? 3 : node.borderWidth || 2;
      const borderStyle = node.borderStyle || 'solid';
      const shape = 'roundedRect';
      const radius = shape === 'roundedRect' ? 12 * scale : 0;
      const dasharray = borderStyle === 'dashed' ? '6,4' : borderStyle === 'dotted' ? '2,3' : 'none';

      svg += `\n    <rect id="node-bg-${node.id}" class="node-rect" x="${node.x - w}" y="${node.y - h}" width="${w * 2}" height="${h * 2}" rx="${radius}" ry="${radius}" fill="${color}" stroke="${borderColor}" stroke-width="${borderWidth}" ${dasharray !== 'none' ? `stroke-dasharray="${dasharray}"` : ''} filter="url(#dropshadow)" />`;
    });

    svg += '\n  </g>\n\n  <!-- Layer: Node Texts -->\n  <g id="nodes-text-layer" class="node-texts">';

    nodes.forEach((node) => {
      const depth = depthMap.get(node.id) ?? 0;
      const isRoot = depth === 0;
      const isLevel1 = depth === 1;
      const scale = isRoot ? 1.3 : isLevel1 ? 1.0 : 0.9;
      const fontSize = (node.fontSize || 14) * scale + (isRoot ? 2 : 0);
      const fontWeight = isRoot ? 'bold' : node.fontWeight === 'bold' ? 'bold' : 'normal';
      const fontStyle = node.fontStyle === 'italic' ? 'italic' : 'normal';
      const textDecoration = node.textDecoration && node.textDecoration !== 'none' ? node.textDecoration : 'none';

      const branchColor = branchColorMap.get(node.id);
      const bgColor = isRoot ? rootBg : branchColor ? branchColor : (node.color || '#FFFFFF');
      const textColor = getReadableTextColor(bgColor, node.textColor);

      let textElement = `<text id="node-text-${node.id}" class="node-text" x="${node.x}" y="${node.y}" fill="${textColor}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" text-decoration="${textDecoration}">${escapeXml(node.nodeText)}</text>`;
      if (node.hyperlink && node.hyperlink.trim()) {
        textElement = `<a xlink:href="${escapeXml(node.hyperlink)}" target="_blank">${textElement}</a>`;
      }
      svg += `\n    ${textElement}`;
    });

    svg += '\n  </g>\n</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error exporting as SVG:', error);
    alert('Lỗi khi xuất SVG: ' + (error instanceof Error ? error.message : 'Không xác định'));
  }
}

// =====================================
// HỖ TRỢ FUNCTIONS
// =====================================

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function dataURItoBlob(dataURI: string): Blob {
  const arr = dataURI.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Chọn màu chữ readable dựa trên nền
function getReadableTextColor(bg: string, fallback?: string): string {
  const hex = normalizeHex(bg);
  if (!hex) return fallback || '#111111';
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum < 0.55) return '#FFFFFF';
  if (lum < 0.8) return '#111111';
  return '#1f2937';
}

function normalizeHex(color: string): string | null {
  const c = color.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(c)) return c.toUpperCase();
  if (/^#([0-9a-fA-F]{3})$/.test(c)) {
    return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return match ? {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

// =====================================
// EXPORT DEFAULT
// =====================================

export default {
  exportAsText,
  downloadAsText,
  downloadAsImagePNG,
  downloadAsPDF,
};
