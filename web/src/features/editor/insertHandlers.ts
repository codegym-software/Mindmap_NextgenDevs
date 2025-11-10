import React from 'react';
import { useEditorStore } from '../../app/store/useEditorStore';

// Types for various content
export type NoteData = {
  type: 'note';
  text: string;
  color?: string;
};

export type LabelData = {
  type: 'label';
  text: string;
  color: string;
};

export type HyperlinkData = {
  type: 'hyperlink';
  url: string;
  title?: string;
};

export type AttachmentData = {
  type: 'attachment';
  filename: string;
  filesize: number;
  filetype: string;
  url: string;
};

export type ImageData = {
  type: 'image';
  url: string;
  width?: number;
  height?: number;
  caption?: string;
};

export type StickerData = {
  type: 'sticker';
  emoji: string;
};

export type MarkerData = {
  type: 'marker';
  color: string;
  style?: 'highlight' | 'underline' | 'strike';
};

export type AudioData = {
  type: 'audio';
  url: string;
  duration?: number;
};

export type LaTeXData = {
  type: 'latex';
  formula: string;
};

export type TaskData = {
  type: 'task';
  text: string;
  completed: boolean;
  dueDate?: string;
};

// Functions to handle content insertion
export const useInsertHandlers = () => {
  const { nodes, edges, setGraph } = useEditorStore();

  const createNodeOrUpdate = (nodeId: string, content: any) => {
    if (!nodeId) {
      // Create new node
      const newId = `n-${Date.now()}`;
      const newNode = {
        id: newId,
        text: '',
        x: 0,
        y: 0,
        ...content
      };
      setGraph([...nodes, newNode], edges);
      return newId;
    } else {
      // Update existing node
      const newNodes = nodes.map(node => 
        node.id === nodeId ? { ...node, ...content } : node
      );
      setGraph(newNodes, edges);
      return nodeId;
    }
  };

  const handlers = {
    note: (nodeId: string, text: string = '') => {
      const noteData: NoteData = {
        type: 'note',
        text,
        color: '#ffd700'
      };
      return createNodeOrUpdate(nodeId, { note: noteData });
    },

    label: (nodeId: string, text: string = '', color: string = '#3b82f6') => {
      const labelData: LabelData = {
        type: 'label',
        text,
        color
      };
      return createNodeOrUpdate(nodeId, { label: labelData });
    },

    hyperlink: (nodeId: string, url: string = '', title?: string) => {
      const hyperlinkData: HyperlinkData = {
        type: 'hyperlink',
        url,
        title
      };
      return createNodeOrUpdate(nodeId, { hyperlink: hyperlinkData });
    },

    attachment: (nodeId: string, file: File) => {
      const attachmentData: AttachmentData = {
        type: 'attachment',
        filename: file.name,
        filesize: file.size,
        filetype: file.type,
        url: URL.createObjectURL(file)
      };
      return createNodeOrUpdate(nodeId, { attachment: attachmentData });
    },

    image: (nodeId: string, file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData: ImageData = {
          type: 'image',
          url: e.target?.result as string
        };
        createNodeOrUpdate(nodeId, { image: imageData });
      };
      reader.readAsDataURL(file);
      return nodeId;
    },

    sticker: (nodeId: string, emoji: string = '😊') => {
      const stickerData: StickerData = {
        type: 'sticker',
        emoji
      };
      return createNodeOrUpdate(nodeId, { sticker: stickerData });
    },

    marker: (nodeId: string, color: string = '#ffeb3b') => {
      const markerData: MarkerData = {
        type: 'marker',
        color,
        style: 'highlight'
      };
      return createNodeOrUpdate(nodeId, { marker: markerData });
    },

    audio: (nodeId: string, file: File) => {
      const audioData: AudioData = {
        type: 'audio',
        url: URL.createObjectURL(file)
      };
      return createNodeOrUpdate(nodeId, { audio: audioData });
    },

    latex: (nodeId: string, formula: string = '') => {
      const latexData: LaTeXData = {
        type: 'latex',
        formula
      };
      return createNodeOrUpdate(nodeId, { latex: latexData });
    },

    task: (nodeId: string, text: string = '') => {
      const taskData: TaskData = {
        type: 'task',
        text,
        completed: false
      };
      return createNodeOrUpdate(nodeId, { task: taskData });
    }
  };

  return handlers;
};

export const getDefaultContent = (type: string) => {
  switch (type) {
    case 'note':
      return { text: 'New note...' };
    case 'label':
      return { text: 'Label', color: '#3b82f6' };
    case 'hyperlink':
      return { url: 'https://', title: 'Link title' };
    case 'sticker':
      return { emoji: '😊' };
    case 'marker':
      return { color: '#ffeb3b', style: 'highlight' };
    case 'latex':
      return { formula: '\\sum_{i=1}^n i' };
    case 'task':
      return { text: 'New task', completed: false };
    default:
      return {};
  }
};