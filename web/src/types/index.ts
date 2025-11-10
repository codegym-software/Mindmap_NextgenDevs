export type NodeContent = {
  note: NoteData;
  label: LabelData;
  hyperlink: HyperlinkData;
  attachment: AttachmentData;
  image: ImageData;
  sticker: StickerData;
  marker: MarkerData;
  audio: AudioData;
  latex: LaTeXData;
  task: TaskData;
};

export interface NodeData {
  id: string;
  text: string;
  x: number;
  y: number;
  content?: Array<NodeContent[keyof NodeContent]>;
  color?: string;
  parentId?: string;
  side?: 'left' | 'right';
  collapsed?: boolean;
  children?: NodeData[];
}

export interface NoteData {
  type: 'note';
  text: string;
  createdAt: string;
}

export interface LabelData {
  type: 'label';
  text: string;
}

export interface HyperlinkData {
  type: 'hyperlink';
  url: string;
  title: string;
}

export interface AttachmentData {
  type: 'attachment';
  name: string;
  url: string;
}

export interface ImageData {
  type: 'image';
  url: string;
  caption?: string;
}

export interface StickerData {
  type: 'sticker';
  emoji: string;
}

export interface MarkerData {
  type: 'marker';
  color: string;
}

export interface AudioData {
  type: 'audio';
  url: string;
  name: string;
}

export interface LaTeXData {
  type: 'latex';
  formula: string;
}

export interface TaskData {
  type: 'task';
  text: string;
  completed: boolean;
}