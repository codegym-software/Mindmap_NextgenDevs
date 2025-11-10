export const getDefaultContent = (type: string) => {
  switch (type) {
    case 'note':
      return {
        type: 'note',
        text: '',
        createdAt: new Date().toISOString()
      };
    case 'label':
      return {
        type: 'label',
        text: ''
      };
    case 'hyperlink':
      return {
        type: 'hyperlink',
        url: '',
        title: ''
      };
    case 'sticker':
      return {
        type: 'sticker',
        emoji: '😊'
      };
    case 'marker':
      return {
        type: 'marker',
        color: '#ffeb3b'
      };
    case 'latex':
      return {
        type: 'latex',
        formula: '\\sum_{i=1}^n i'
      };
    case 'task':
      return {
        type: 'task',
        text: '',
        completed: false
      };
    default:
      return {
        type,
        text: ''
      };
  }
};