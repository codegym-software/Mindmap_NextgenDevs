/**
 * Các hàm tiện ích để định dạng dữ liệu (ngày, giờ, text).
 * (File này trước đó trống)
 */
import { NodeData, EdgeData } from "../types";

export function formatRelativeDate(isoDate: string | Date): string {
    const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (isNaN(seconds)) return "Vừa xong";

    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} năm trước`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} tháng trước`;
    interval = seconds / 86400;
    if (interval > 1) {
        if (interval < 7) return `${Math.floor(interval)} ngày trước`;
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)} giờ trước`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)} phút trước`;

    return "Vừa xong";
}

export function downloadTextFile(filename: string, text: string): void {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${filename}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
}

export function generateTextTree(nodes: NodeData[], edges: EdgeData[]): string {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const adj = new Map<string, string[]>();
    edges.forEach(e => {
        if (!adj.has(e.from)) adj.set(e.from, []);
        adj.get(e.from)!.push(e.to);
    });
    let text = "";
    const dfs = (nodeId: string, depth: number) => {
        const node = nodeMap.get(nodeId);
        if (!node) return;
        text += `${" ".repeat(depth)}- ${node.text || '(Trống)'}\n`;
        const children = adj.get(nodeId) || [];
        children.forEach(childId => dfs(childId, depth + 1));
    };
    const rootNodes = nodes.filter(n => !n.parentId || !nodeMap.has(n.parentId));
    rootNodes.forEach(root => dfs(root.id, 0));
    return text;
}