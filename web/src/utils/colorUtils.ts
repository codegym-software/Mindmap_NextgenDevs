/**
 * Module tiện ích xử lý màu sắc cho Visualization
 * Sử dụng toán học Native để tối ưu hiệu năng, không dùng thư viện ngoài.
 */

// Chuyển đổi Hex sang HSL
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 100 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Chuyển đổi HSL sang Hex
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Tính toán màu nền thông minh dựa trên độ sâu (Depth-based Lightness).
 * Sử dụng nội suy tuyến tính (Lerp) để làm nhạt màu dần đều.
 */
export function getBranchColorByDepth(
  baseHex: string, 
  depth: number, 
  cutoffLevel: number = 6
): { bg: string; border: string } {
  // 1. Base Color (Gốc)
  if (depth <= 1) {
    return { bg: baseHex, border: baseHex };
  }

  // 2. The White Threshold (Cấp >= 6)
  if (depth >= cutoffLevel) {
    // Nền trắng, Viền giữ màu gốc của nhánh để nhận diện
    return { bg: '#FFFFFF', border: baseHex };
  }

  // 3. Gradient Fading (Cấp 2 -> 5)
  const { h, s, l: startL } = hexToHSL(baseHex);
  const targetL = 96; // Gần trắng tuyệt đối
  
  // Tính toán phần trăm tiến trình (t) từ 0 (Level 1) đến 1 (Level Cutoff)
  // depth 1 -> t=0
  // depth 6 -> t=1
  const t = (depth - 1) / (cutoffLevel - 1);
  
  // Công thức Lerp cho Lightness: L_new = L_start + (L_target - L_start) * t
  const currentL = startL + (targetL - startL) * t;

  const fadedColor = hslToHex(h, s, currentL);
  
  // Với các node nhạt, viền nên đậm hơn nền một chút hoặc dùng chính màu đó
  return { bg: fadedColor, border: fadedColor };
}

/**
 * Tính toán độ tương phản để chọn màu chữ (Đen/Trắng) chuẩn WCAG.
 */
export function getContrastingTextColor(hex: string): '#000000' | '#FFFFFF' {
  const { r, g, b } = hexToRgbSimple(hex);
  // Công thức YIQ standard
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

function hexToRgbSimple(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}