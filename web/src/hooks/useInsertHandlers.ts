import { useState } from 'react';
import { NodeData } from '../types';

export interface InsertHandlers {
  note: (nodeId: string, text: string) => void;
  label: (nodeId: string, text: string) => void;
  hyperlink: (nodeId: string, url: string, title?: string) => void;
  attachment: (nodeId: string, file: File) => void;
  image: (nodeId: string, file: File) => void;
  sticker: (nodeId: string, emoji: string) => void;
  marker: (nodeId: string, color: string) => void;
  audio: (nodeId: string, file: File) => void;
  latex: (nodeId: string, formula: string) => void;
  task: (nodeId: string, text: string) => void;
}

export const useInsertHandlers = (): InsertHandlers => {
  const [nodes, setNodes] = useState<NodeData[]>([]);

  const updateNodeContent = (nodeId: string, content: any) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          content: Array.isArray(node.content) 
            ? [...node.content, content]
            : [content]
        };
      }
      return node;
    }));
  };

  return {
    note: (nodeId, text) => {
      updateNodeContent(nodeId, {
        type: 'note',
        text,
        createdAt: new Date().toISOString()
      });
    },
    label: (nodeId, text) => {
      updateNodeContent(nodeId, {
        type: 'label',
        text
      });
    },
    hyperlink: (nodeId, url, title) => {
      updateNodeContent(nodeId, {
        type: 'hyperlink',
        url,
        title: title || url
      });
    },
    attachment: (nodeId, file) => {
      // Here you would normally upload the file and get a URL
      const reader = new FileReader();
      reader.onload = () => {
        updateNodeContent(nodeId, {
          type: 'attachment',
          name: file.name,
          url: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    },
    image: (nodeId, file) => {
      const reader = new FileReader();
      reader.onload = () => {
        updateNodeContent(nodeId, {
          type: 'image',
          url: reader.result as string,
          caption: file.name
        });
      };
      reader.readAsDataURL(file);
    },
    sticker: (nodeId, emoji) => {
      updateNodeContent(nodeId, {
        type: 'sticker',
        emoji
      });
    },
    marker: (nodeId, color) => {
      updateNodeContent(nodeId, {
        type: 'marker',
        color
      });
    },
    audio: (nodeId, file) => {
      const reader = new FileReader();
      reader.onload = () => {
        updateNodeContent(nodeId, {
          type: 'audio',
          url: reader.result as string,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    },
    latex: (nodeId, formula) => {
      updateNodeContent(nodeId, {
        type: 'latex',
        formula
      });
    },
    task: (nodeId, text) => {
      updateNodeContent(nodeId, {
        type: 'task',
        text,
        completed: false
      });
    }
  };
};