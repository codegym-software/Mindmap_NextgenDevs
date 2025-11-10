import { NodeContent } from "../types";
import { getDefaultContent } from "./defaultContent";

export const handleInsertionType = (type: keyof NodeContent, insertHandlers: any, selectedNodeId: string | null) => {
  const newContent = getDefaultContent(type);
  switch (type) {
    case 'image':
    case 'audio':
    case 'attachment': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = type === 'image' ? 'image/*' : 
                    type === 'audio' ? 'audio/*' : 
                    '*/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          insertHandlers[type](selectedNodeId || '', file);
        }
      };
      input.click();
      break;
    }
    case 'hyperlink': {
      const url = prompt('Enter URL:', 'https://');
      if (url) {
        const title = prompt('Enter title (optional):', '');
        insertHandlers.hyperlink(selectedNodeId || '', url, title || undefined);
      }
      break;
    }
    case 'latex': {
      const formula = prompt('Enter LaTeX formula:', '\\sum_{i=1}^n i');
      if (formula) {
        insertHandlers.latex(selectedNodeId || '', formula);
      }
      break;
    }
    case 'sticker': {
      const emoji = prompt('Enter emoji:', '😊');
      if (emoji) {
        insertHandlers.sticker(selectedNodeId || '', emoji);
      }
      break;
    }
    case 'marker': {
      const color = prompt('Enter color (hex or name):', '#ffeb3b');
      if (color) {
        insertHandlers.marker(selectedNodeId || '', color);
      }
      break;
    }
    default: {
      insertHandlers[type](selectedNodeId || '', newContent.text);
      break;
    }
  }
};