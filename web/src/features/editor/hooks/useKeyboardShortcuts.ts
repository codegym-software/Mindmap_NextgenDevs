/**
 * Hook quản lý phím tắt cho Editor (Tab, Enter, Delete, Undo/Redo, F2, v.v.).
 * Tái cấu trúc logic từ `Editor.tsx` gốc (phần `useEffect` -> `onKey`).
 * Tuân thủ User Story #6, #7, #8, #9, #11, #33, #35.
 */
import { useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { v4 as uuidv4 } from 'uuid';
import { NodeData, EdgeData } from '../../../core/types';

export function useKeyboardShortcuts(
    startEditing: (nodeId: string) => void,
    isEditing: boolean,
    onSave?: () => void,
    onToggleStylePanel?: () => void,
    onLayout?: () => void,
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

    const handleAddChild = useCallback(() => {
        if (!selectedNodeId) return;
        const parentNode = nodes.find(n => n.id === selectedNodeId);
        if (!parentNode) return;
        const newNodeId = uuidv4();
       
        const newNodeData: NodeData = {
            id: newNodeId,
            text: "",
            x: parentNode.x + (parentNode.width || 150) + 80,
            y: parentNode.y,
            parentId: selectedNodeId,
        };
        const newEdgeData: EdgeData = { from: selectedNodeId, to: newNodeId };
       
        addNodeAndEdge(newNodeData, newEdgeData);
        startEditing(newNodeId);
    }, [selectedNodeId, nodes, addNodeAndEdge, startEditing]);

    const handleAddSibling = useCallback(() => {
        if (!selectedNodeId) return;
       
        const currentNode = nodes.find(n => n.id === selectedNodeId);
        const parentId = currentNode?.parentId || "root";
       
        if (selectedNodeId === 'root' || !currentNode?.parentId) {
            handleAddChild();
            return;
        }
        const parentNode = nodes.find(n => n.id === parentId);
        if (!parentNode) return;
        const siblings = nodes.filter(n => n.parentId === parentId);
        const lastSiblingY = siblings.length > 0 ? Math.max(...siblings.map(s => s.y)) : parentNode.y;
        const newNodeId = uuidv4();
        const newNodeData: NodeData = {
            id: newNodeId,
            text: "",
            x: currentNode.x,
            y: lastSiblingY + (currentNode.height || 40) + 30,
            parentId: parentId,
        };
        const newEdgeData: EdgeData = { from: parentId, to: newNodeId };
       
        addNodeAndEdge(newNodeData, newEdgeData);
        startEditing(newNodeId);
    }, [selectedNodeId, nodes, addNodeAndEdge, startEditing, handleAddChild]);

    const handleDelete = useCallback(() => {
        if (!selectedNodeId || selectedNodeId === 'root') return;
        const parentIdToSelect = deleteNodeAndDescendants(selectedNodeId);
        if (parentIdToSelect) setSelectedNodeId(parentIdToSelect);
    }, [selectedNodeId, deleteNodeAndDescendants, setSelectedNodeId]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!isEnabled) return;
        const target = event.target as HTMLElement;
        const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
       
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            onSave?.();
            return;
        }

        if (isEditing) {
             if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                undo();
            } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                redo();
            }
            return;
        }
       
        if (isInputFocused) return;

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            undo();
        }
        else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
            event.preventDefault();
            redo();
        }

        if (!selectedNodeId) return;

        if (event.key === 'Tab') {
            event.preventDefault();
            handleAddChild();
        }
        else if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleAddSibling();
        }
        else if (['Delete', 'Backspace'].includes(event.key)) {
            event.preventDefault();
            handleDelete();
        }
        else if (event.key === 'F2') {
            event.preventDefault();
            startEditing(selectedNodeId);
        }
        else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
             startEditing(selectedNodeId);
        }
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
             event.preventDefault();
             onToggleStylePanel?.();
        }
         else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
             event.preventDefault();
             onLayout?.();
         }
    }, [
        isEnabled, isEditing, selectedNodeId,
        handleAddChild, handleAddSibling, handleDelete,
        undo, redo, startEditing, onSave, onToggleStylePanel, onLayout
    ]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEnabled, handleKeyDown]);
}