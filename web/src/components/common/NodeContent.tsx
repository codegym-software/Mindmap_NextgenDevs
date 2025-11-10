import { NodeContent as NodeContentType } from '../types';
import 'katex/dist/katex.min.css';
import { renderToString } from 'katex';

interface NodeContentProps {
  content: NodeContentType[keyof NodeContentType];
}

export const NodeContent = ({ content }: NodeContentProps) => {
  switch (content.type) {
    case 'note':
      return (
        <div className="node-content note">
          <p>{content.text}</p>
          <small>{new Date(content.createdAt).toLocaleString()}</small>
        </div>
      );
    case 'label':
      return (
        <div className="node-content label">
          <span>{content.text}</span>
        </div>
      );
    case 'hyperlink':
      return (
        <div className="node-content hyperlink">
          <a href={content.url} target="_blank" rel="noopener noreferrer">
            {content.title}
          </a>
        </div>
      );
    case 'attachment':
      return (
        <div className="node-content attachment">
          <a href={content.url} download={content.name}>
            {content.name}
          </a>
        </div>
      );
    case 'image':
      return (
        <div className="node-content image">
          <img src={content.url} alt={content.caption || ''} />
          {content.caption && <caption>{content.caption}</caption>}
        </div>
      );
    case 'sticker':
      return (
        <div className="node-content sticker">
          <span>{content.emoji}</span>
        </div>
      );
    case 'marker':
      return (
        <div 
          className="node-content marker"
          style={{ backgroundColor: content.color }}
        />
      );
    case 'audio':
      return (
        <div className="node-content audio">
          <audio controls>
            <source src={content.url} />
            {content.name}
          </audio>
        </div>
      );
    case 'latex':
      return (
        <div 
          className="node-content latex"
          dangerouslySetInnerHTML={{ 
            __html: renderToString(content.formula, { throwOnError: false }) 
          }}
        />
      );
    case 'task':
      return (
        <div className="node-content task">
          <input 
            type="checkbox" 
            checked={content.completed}
            onChange={() => {}} // Add handler later
          />
          <span>{content.text}</span>
        </div>
      );
    default:
      return null;
  }
};