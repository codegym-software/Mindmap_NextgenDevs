import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { addBtnStyle, deleteBtnStyle } from './styles';

const CustomNode = ({ data, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [text, setText] = useState(data.label);
    const inputRef = useRef(null);
    const prevEditTokenRef = useRef(data.__editToken);

    useEffect(() => { setText(data.label); }, [data.label]);
    useEffect(() => {
        if (data.__editToken && data.__editToken !== prevEditTokenRef.current) {
            prevEditTokenRef.current = data.__editToken;
            setIsEditing(true);
            data.onEditStart && data.onEditStart();
            setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 10);
        }
    }, [data.__editToken, data]);
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        if (!isEditing) {
            setIsEditing(true);
            data.onEditStart && data.onEditStart();
        }
    };
    const finishEdit = (save) => {
        if (save && text !== data.label && data.onUpdateLabel) {
            data.onUpdateLabel(data.id, text);
        } else if (!save) {
            setText(data.label);
        }
        setIsEditing(false);
        data.onEditEnd && data.onEditEnd();
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); finishEdit(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finishEdit(false); }
        else if (e.key === 'Delete' || e.key === 'Backspace') { e.stopPropagation(); }
    };
    const handleBlur = () => finishEdit(true);

    const handleAddChild = (e, side) => {
        e.stopPropagation();
        data.onAddChild && data.onAddChild(data.id, side);
    };
    const side = data.side || 'center';

    const getGradientBackground = (color) => {
        if (data.isRoot) return 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)';
        const v = {
            '#6c63ff': 'linear-gradient(135deg,#6c63ff 0%,#a855f7 100%)',
            '#22c55e': 'linear-gradient(135deg,#22c55e 0%,#84cc16 100%)',
            '#f59e0b': 'linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%)',
            '#ef4444': 'linear-gradient(135deg,#ef4444 0%,#f87171 100%)',
            '#a855f7': 'linear-gradient(135deg,#a855f7 0%,#c084fc 100%)',
            '#06b6d4': 'linear-gradient(135deg,#06b6d4 0%,#22d3ee 100%)',
            '#3b82f6': 'linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%)',
            '#84cc16': 'linear-gradient(135deg,#84cc16 0%,#a3e635 100%)'
        };
        return v[color] || 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)';
    };

    const nodeStyle = {
        background: getGradientBackground(data.color),
        border: selected ? '2px solid #667eea' : '2px solid transparent',
        borderRadius: '12px',
        padding: '8px 16px',
        minWidth: '120px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        position: 'relative'
    };

    return (
        <div
            style={nodeStyle}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Handles logic */}
            {side === 'left' && (
                <>
                    <Handle type="target" position={Position.Right} id={`${data.id}-target-right`} style={{ background:'#fff' }}/>
                    <Handle type="source" position={Position.Left} id={`${data.id}-source-left`} style={{ background:'#fff' }}/>
                </>
            )}
            {side === 'right' && (
                <>
                    <Handle type="target" position={Position.Left} id={`${data.id}-target-left`} style={{ background:'#fff' }}/>
                    <Handle type="source" position={Position.Right} id={`${data.id}-source-right`} style={{ background:'#fff' }}/>
                </>
            )}
            {side === 'center' && (
                <>
                    <Handle type="target" position={Position.Left} id={`${data.id}-target-left`} style={{ background:'#fff' }}/>
                    <Handle type="source" position={Position.Left} id={`${data.id}-source-left`} style={{ background:'#fff' }}/>
                    <Handle type="target" position={Position.Right} id={`${data.id}-target-right`} style={{ background:'#fff' }}/>
                    <Handle type="source" position={Position.Right} id={`${data.id}-source-right`} style={{ background:'#fff' }}/>
                </>
            )}

            {isEditing ? (
                <input
                    ref={inputRef}
                    value={text}
                    onChange={(e)=>setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    style={{
                        background:'transparent',
                        border:'none',
                        outline:'none',
                        color:'white',
                        fontSize:'14px',
                        fontWeight:'500',
                        textAlign:'center',
                        width:'100%'
                    }}
                />
            ) : (
                <div style={{ color:'white', fontSize:'14px', fontWeight:'500' }}>{text}</div>
            )}

            {!isEditing && hovered && (
                <>
                    {!data.isRoot && (
                        <button
                            onClick={(e)=>handleAddChild(e, side === 'left' ? 'left' : 'right')}
                            style={addBtnStyle(side === 'left' ? 'left' : 'right')}
                            title="Thêm node con"
                        >+</button>
                    )}
                    {data.isRoot && (
                        <>
                            <button
                                onClick={(e)=>handleAddChild(e,'right')}
                                style={addBtnStyle('right')}
                                title="Thêm node con (phải)"
                            >+</button>
                            <button
                                onClick={(e)=>handleAddChild(e,'left')}
                                style={addBtnStyle('left')}
                                title="Thêm node con (trái)"
                            >+</button>
                        </>
                    )}
                </>
            )}

            {!data.isRoot && !isEditing && hovered && (
                <button
                    onClick={(e)=>{ e.stopPropagation(); data.onDeleteNode && data.onDeleteNode(); }}
                    style={deleteBtnStyle}
                    title="Xóa node"
                >×</button>
            )}
        </div>
    );
};

export default CustomNode;