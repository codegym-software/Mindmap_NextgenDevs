import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import MindmapEditor from './MindmapEditor';

const MindmapEditorWrapper = (props) => (
    <ReactFlowProvider>
        <MindmapEditor {...props} />
    </ReactFlowProvider>
);

export default MindmapEditorWrapper;