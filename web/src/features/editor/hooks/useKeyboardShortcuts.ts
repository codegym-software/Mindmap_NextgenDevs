import { useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { v4 as uuidv4 } from 'uuid';
import { NodeData, EdgeData } from '../../../core/types';

/**
 * Hook để quản lý phím tắt cho Editor.
 * Tuân thủ User Story #6, #7, #8, #9, #11, #35
 */
export function useKeyboardShortcuts(
    // Callback để kích hoạt DOM overlay editor
    startEditing: (nodeId: string) => void,
    // Callbacks cho các hành động global
    onSave?: () => void,
    onToggleStylePanel?: () => void,
    onLayout?: () => void,
    // Cờ để bật/tắt hook (ví dụ: khi modal mở)
    isEnabled: boolean = true
) {
    const {
        nodes,
        selectedNodeId,
        addNodeAndEdge,
        deleteNodeAndDescendants,
        undo,
        redo,
        setSelectedNodeId,
    } = useEditorStore();

    // --- Action Handlers ---

    // Thêm Node con (User Story #6)
    const handleAddChild = useCallback(() => {
        if (!selectedNodeId) return;
        const parentNode = nodes.find(n => n.id === selectedNodeId);
        if (!parentNode) return;

        const newNodeId = uuidv4();
        // TODO: Cải thiện vị trí node mới dựa trên layout/anh em
        const newNodeData: NodeData = {
            id: newNodeId,
            text: "",
            x: parentNode.x + (parentNode.width || 150) + 80,
            y: parentNode.y,
            parentId: selectedNodeId,
        };
        const newEdgeData: EdgeData = { from: selectedNodeId, to: newNodeId };
        
        addNodeAndEdge(newNodeData, newEdgeData);
        startEditing(newNodeId); // User Story #33
    }, [selectedNodeId, nodes, addNodeAndEdge, startEditing]);

    // Thêm Node anh em (User Story #7)
    const handleAddSibling = useCallback(() => {
        if (!selectedNodeId) return;
        if (selectedNodeId === 'root') { handleAddChild(); return; } // Root không có anh em

        const currentNode = nodes.find(n => n.id === selectedNodeId);
        const parentId = currentNode?.parentId;
        if (!parentId) { handleAddChild(); return; }; // Node nổi thì coi như thêm con

        const parentNode = nodes.find(n => n.id === parentId);
        if (!parentNode) return;

        const siblings = nodes.filter(n => n.parentId === parentId);
        const lastSiblingY = siblings.length > 0 ? Math.max(...siblings.map(s => s.y)) : parentNode.y;

        const newNodeId = uuidv4();
        const newNodeData: NodeData = {
            id: newNodeId,
            text: "",
            x: currentNode.x,
            y: lastSiblingY + (currentNode.height || 40) + 30, // Đặt bên dưới anh em cuối
            parentId: parentId,
        };
        const newEdgeData: EdgeData = { from: parentId, to: newNodeId };
        
        addNodeAndEdge(newNodeData, newEdgeData);
        startEditing(newNodeId); // User Story #33
    }, [selectedNodeId, nodes, addNodeAndEdge, startEditing, handleAddChild]);

    // Xóa Node (User Story #9)
    const handleDelete = useCallback(() => {
        if (!selectedNodeId || selectedNodeId === 'root') return;
        const parentIdToSelect = deleteNodeAndDescendants(selectedNodeId);
        if (parentIdToSelect) setSelectedNodeId(parentIdToSelect);
    }, [selectedNodeId, deleteNodeAndDescendants, setSelectedNodeId]);

    // --- Global KeyDown Handler ---
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!isEnabled) return;

        const target = event.target as HTMLElement;
        const isInputFocused = target && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));

        // Global shortcuts (hoạt động ngay cả khi đang gõ)
        // Lưu (User Story #35 - giả sử Ctrl+S)
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            onSave?.();
            return;
        }

        // Nếu đang gõ, bỏ qua các phím tắt khác
        if (isInputFocused) return;

        // --- Editor Shortcuts (chỉ hoạt động khi không gõ) ---

        // Undo/Redo (User Story #11)
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            undo();
        }
        else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
            event.preventDefault();
            redo();
        }

        // --- Phím tắt cần chọn node ---
        if (!selectedNodeId) return;

        // Thêm con (User Story #6)
        if (event.key === 'Tab') {
            event.preventDefault();
            handleAddChild();
        }
        // Thêm anh em (User Story #7)
        else if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleAddSibling();
        }
        // Xóa (User Story #9)
        else if (['Delete', 'Backspace'].includes(event.key)) {
            event.preventDefault();
            handleDelete();
        }
        // Bắt đầu Edit (User Story #8)
        else if (event.key === 'F2') {
            event.preventDefault();
            startEditing(selectedNodeId);
        }
        // Bắt đầu gõ để edit (User Story #33)
        else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
             // Không preventDefault(), để ký tự đầu tiên được nhập
             startEditing(selectedNodeId);
        }
        // Mở Panel Style (User Story #14)
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
             event.preventDefault();
             onToggleStylePanel?.();
        }
        // Áp dụng Layout (ví dụ: Ctrl/Cmd + L)
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
             event.preventDefault();
             onLayout?.();
        }

    }, [
        isEnabled, selectedNodeId, handleAddChild, handleAddSibling, handleDelete,
        undo, redo, startEditing, onSave, onToggleStylePanel, onLayout
    ]);

    // Gắn listener
    useEffect(() => {
        if (isEnabled) window.addEventListener('keydown', handleKeyDown);
        else window.removeEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEnabled, handleKeyDown]);
}
