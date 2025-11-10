import React from 'react';
import type { NodeData } from '../../app/store/useEditorStore';
import { IconNote, IconTag, IconLink, IconPaperclip, IconPhoto, IconSticker, IconMarker, IconMicrophone, IconMath, IconCheckbox } from '@tabler/icons-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './NodeContent.css';

interface NodeContentProps {
  node: NodeData;
  scale: number;
}

const NodeContent: React.FC<NodeContentProps> = ({ node, scale }) => {
  const renderContent = () => {
    if (node.note) {
      return (
        <div className="node-note" style={{ backgroundColor: node.note.color }}>
          <IconNote size={16} />
          <span>{node.note.text}</span>
        </div>
      );
    }

    if (node.label) {
      return (
        <div className="node-label" style={{ backgroundColor: node.label.color }}>
          <IconTag size={16} />
          <span>{node.label.text}</span>
        </div>
      );
    }

    if (node.hyperlink) {
      return (
        <a 
          href={node.hyperlink.url}
          target="_blank"
          rel="noopener noreferrer"
          className="node-hyperlink"
        >
          <IconLink size={16} />
          <span>{node.hyperlink.title || node.hyperlink.url}</span>
        </a>
      );
    }

    if (node.attachment) {
      return (
        <div className="node-attachment">
          <IconPaperclip size={16} />
          <span>{node.attachment.filename}</span>
          <span className="text-sm">({Math.round(node.attachment.filesize / 1024)}KB)</span>
        </div>
      );
    }

    if (node.image) {
      return (
        <div className="node-image">
          <img 
            src={node.image.url} 
            alt={node.image.caption || ''} 
            style={{ 
              maxWidth: (node.image.width || 200) * scale,
              maxHeight: (node.image.height || 150) * scale
            }}
          />
          {node.image.caption && (
            <span className="image-caption">{node.image.caption}</span>
          )}
        </div>
      );
    }

    if (node.sticker) {
      return (
        <div className="node-sticker" style={{ fontSize: 24 * scale }}>
          {node.sticker.emoji}
        </div>
      );
    }

    if (node.marker) {
      const style = {
        backgroundColor: node.marker.style === 'highlight' ? `${node.marker.color}40` : 'transparent',
        textDecoration: node.marker.style === 'underline' ? `underline ${node.marker.color}` :
                       node.marker.style === 'strike' ? `line-through ${node.marker.color}` : 'none'
      };
      return (
        <div className="node-marker" style={style}>
          {node.text}
        </div>
      );
    }

    if (node.audio) {
      return (
        <div className="node-audio">
          <IconMicrophone size={16} />
          <audio controls src={node.audio.url} />
        </div>
      );
    }

    if (node.latex) {
      return (
        <div 
          className="node-latex"
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(node.latex.formula, {
              throwOnError: false,
              displayMode: true
            })
          }}
        />
      );
    }

    if (node.task) {
      return (
        <div className="node-task">
          <input
            type="checkbox"
            checked={node.task.completed}
            onChange={() => {/* Handle task toggle */}}
          />
          <span style={{ textDecoration: node.task.completed ? 'line-through' : 'none' }}>
            {node.task.text}
          </span>
          {node.task.dueDate && (
            <span className="text-sm text-gray-400">
              Due: {new Date(node.task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      );
    }

    return node.text || '(chưa có nội dung)';
  };

  return (
    <div className="node-content">
      {renderContent()}
    </div>
  );
};

export default NodeContent;