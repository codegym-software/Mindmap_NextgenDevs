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
    // Focus và select chỉ khi bắt đầu edit
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Auto-resize textarea khi text thay đổi
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
        }
    }, [isEditing, text]);

    // Hàm tự động xuống dòng sau 10 từ
    const formatTextWithLineBreaks = (inputText) => {
        const words = inputText.split(' ');
        const lines = [];
        for (let i = 0; i < words.length; i += 10) {
            lines.push(words.slice(i, i + 10).join(' '));
        }
        return lines.join('\n');
    };

    const handleDoubleClick = () => {
        if (!isEditing) {
            setIsEditing(true);
            data.onEditStart && data.onEditStart();
        }
    };
    const finishEdit = (save) => {
        if (save && text !== data.label && data.onUpdateLabel) {
            const formattedText = formatTextWithLineBreaks(text);
            data.onUpdateLabel(data.id, formattedText);
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

    // Tính toán kích thước node dựa trên nội dung
    const getNodeDimensions = () => {
        const content = isEditing ? text : data.label;
        const lineCount = content.split('\n').length;
        const wordsCount = content.trim().split(/\s+/).length;
        
        // Tính chiều rộng dựa trên số từ và số dòng
        let width = 120; // minWidth
        if (wordsCount > 5) {
            // Mỗi từ thêm vào sẽ tăng 8px, tối đa 350px
            width = Math.min(350, 120 + (wordsCount - 5) * 8);
        }
        
        // Nếu có nhiều dòng, đảm bảo width đủ rộng
        if (lineCount > 1) {
            width = Math.max(width, 200);
        }
        
        return {
            minWidth: '120px',
            maxWidth: width + 'px',
            width: 'auto'
        };
    };

    // Điều chỉnh padding dựa trên nội dung
    const getPadding = () => {
        const content = isEditing ? text : data.label;
        const lineCount = content.split('\n').length;
        
        if (lineCount > 2) {
            return '10px 14px'; // Padding lớn hơn cho nội dung nhiều dòng
        } else if (lineCount > 1) {
            return '9px 15px';
        }
        return '8px 16px'; // Padding mặc định
    };

    const nodeStyle = {
        background: getGradientBackground(data.color),
        border: selected ? '2px solid #667eea' : '2px solid transparent',
        borderRadius: '12px',
        padding: getPadding(),
        ...getNodeDimensions(),
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
                <textarea
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
                        width:'100%',
                        resize:'none',
                        minHeight:'24px',
                        overflow:'hidden',
                        lineHeight:'1.5',
                        fontFamily:'inherit'
                    }}
                    rows={1}
                />
            ) : (
                <div style={{ 
                    color:'white', 
                    fontSize:'14px', 
                    fontWeight:'500',
                    whiteSpace:'pre-wrap',
                    wordBreak:'break-word',
                    lineHeight:'1.5',
                    maxWidth:'100%',
                    overflowWrap:'break-word'
                }}>{text}</div>
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